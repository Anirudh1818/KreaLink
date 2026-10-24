/**
 * KreaLink — unit tests for roles, state machine, routing, GSTIN and validators.
 * Run: npm run test:unit
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  ADMIN_TRANSITIONS,
  APPLICANT_TRANSITIONS,
  VERIFICATION_STATUSES,
  canAdminTransition,
  canApplicantTransition,
  canPerform,
  decideRoute,
  homeFor,
  safeNextPath,
  type AccessSnapshot,
  type VerificationStatus,
} from "../src/lib/auth/policy";
import { compareRegistration, gstinChecksumChar, validateGstinFormat } from "../src/lib/auth/gstin";
import { validateBrandApplication, validateCreatorApplication, type BrandApplication, type CreatorApplication } from "../src/lib/auth/schema";

describe("verification state machine", () => {
  it("applicants can only submit from draft or info-required", () => {
    assert.ok(canApplicantTransition("unverified", "pending_review"));
    assert.ok(canApplicantTransition("info_required", "pending_review"));
    for (const from of ["pending_review", "verified", "rejected", "suspended"] as VerificationStatus[]) {
      for (const to of VERIFICATION_STATUSES) assert.equal(canApplicantTransition(from, to), false, `${from}→${to}`);
    }
    assert.equal(canApplicantTransition("unverified", "verified"), false);
  });

  it("admins cannot no-op or skip review", () => {
    for (const s of VERIFICATION_STATUSES) assert.equal(canAdminTransition(s, s), false, `${s}→${s}`);
    assert.equal(canAdminTransition("unverified", "verified"), false);
    assert.ok(canAdminTransition("pending_review", "verified"));
    assert.ok(canAdminTransition("verified", "suspended"));
    assert.ok(canAdminTransition("suspended", "verified"));
  });

  it("firestore.rules transition table matches policy.ts exactly", () => {
    const rules = readFileSync("firestore.rules", "utf8");
    const fn = rules.slice(rules.indexOf("function adminTransitionOk"), rules.indexOf("function auditedAs"));
    const parsed: Record<string, string[]> = {};
    for (const m of fn.matchAll(/from == '(\w+)' && to in \[([^\]]*)\]/g)) {
      parsed[m[1]!] = [...m[2]!.matchAll(/'(\w+)'/g)].map((x) => x[1]!).sort();
    }
    const expected = Object.fromEntries(
      Object.entries(ADMIN_TRANSITIONS).filter(([, v]) => v.length).map(([k, v]) => [k, [...v].sort()])
    );
    assert.deepEqual(parsed, expected);
    // Applicant transitions in rules: only unverified/info_required → same or pending_review.
    assert.match(rules, /resource\.data\.status in \['unverified', 'info_required'\]\s*&& next\(\)\.status in \[resource\.data\.status, 'pending_review'\]/);
    assert.deepEqual(Object.entries(APPLICANT_TRANSITIONS).filter(([, v]) => v.length).map(([k]) => k).sort(), ["info_required", "unverified"]);
  });
});

describe("restricted actions (scenarios 8, 12)", () => {
  const base: AccessSnapshot = { signedIn: true, emailVerified: true, role: "brand", status: "verified" };
  it("any non-suspended brand may post and invite (verification is a badge)", () => {
    for (const status of ["verified", "unverified", "pending_review", "rejected", "info_required"] as VerificationStatus[]) {
      assert.equal(canPerform("brand.sendInvitation", { ...base, status }).allowed, true, status);
    }
    assert.equal(canPerform("brand.sendInvitation", { ...base, emailVerified: false, status: "unverified" }).allowed, true);
  });
  it("suspended accounts are blocked (scenario 12)", () => {
    assert.equal(canPerform("brand.sendInvitation", { ...base, status: "suspended" }).allowed, false);
    assert.equal(canPerform("creator.acceptInvitation", { ...base, role: "creator", status: "suspended" }).allowed, false);
  });
  it("signed-out users are blocked", () => {
    assert.equal(canPerform("brand.sendInvitation", { ...base, signedIn: false }).allowed, false);
  });
  it("roles cannot use each other's actions", () => {
    assert.equal(canPerform("creator.acceptInvitation", base).allowed, false);
    assert.equal(canPerform("brand.sendInvitation", { ...base, role: "creator" }).allowed, false);
  });
});

describe("routing (scenarios 4, 5)", () => {
  const brand = { kind: "member", role: "brand" } as const;
  const creator = { kind: "member", role: "creator" } as const;
  const admin = { kind: "admin" } as const;
  const anon = { kind: "anonymous" } as const;

  it("brand is kept out of creator and admin portals", () => {
    assert.deepEqual(decideRoute("/creator", brand), { allow: false, redirectTo: "/brand" });
    assert.deepEqual(decideRoute("/creator-studio", brand), { allow: false, redirectTo: "/brand" });
    assert.deepEqual(decideRoute("/admin/verifications", brand), { allow: false, redirectTo: "/admin/access" });
    assert.deepEqual(decideRoute("/brand/verification", brand), { allow: true });
  });

  it("admins, brands and creators each stay in their own portal", () => {
    for (const path of ["/brand", "/pipeline", "/creator", "/creator-studio", "/join-creator"]) {
      assert.deepEqual(decideRoute(path, admin), { allow: false, redirectTo: "/admin" }, `admin → ${path}`);
    }
    assert.deepEqual(decideRoute("/pipeline", creator), { allow: false, redirectTo: "/creator" });
    assert.deepEqual(decideRoute("/join-creator", brand), { allow: false, redirectTo: "/brand" });
    assert.deepEqual(decideRoute("/pipeline", brand), { allow: true });
    assert.deepEqual(decideRoute("/join-creator", creator), { allow: true });
    // Anonymous visitors can still browse the demo workspaces.
    assert.deepEqual(decideRoute("/pipeline", anon), { allow: true });
  });

  it("brands use the Brand Hub right after signup (no GSTIN gate)", () => {
    assert.deepEqual(decideRoute("/brand", brand), { allow: true });
    assert.deepEqual(decideRoute("/brand/verification", brand), { allow: true });
  });

  it("creators can browse and apply to jobs; brands can't open the creator job board", () => {
    assert.deepEqual(decideRoute("/creator/jobs", creator), { allow: true });
    assert.deepEqual(decideRoute("/creator/jobs", brand), { allow: false, redirectTo: "/brand" });
    assert.deepEqual(decideRoute("/creator/jobs", anon), { allow: true });
  });

  it("creator is kept out of brand and admin portals", () => {
    assert.deepEqual(decideRoute("/brand", creator), { allow: false, redirectTo: "/creator" });
    assert.deepEqual(decideRoute("/admin", creator), { allow: false, redirectTo: "/admin/access" });
    assert.deepEqual(decideRoute("/creator-studio", creator), { allow: true });
  });

  it("admin portal requires admin; signed-in members only see owner-access help", () => {
    assert.deepEqual(decideRoute("/admin", admin), { allow: true });
    assert.deepEqual(decideRoute("/admin", anon), { allow: false, redirectTo: "/login?next=/admin" });
    assert.deepEqual(decideRoute("/admin/access", creator), { allow: true });
    assert.deepEqual(decideRoute("/admin/access", anon), { allow: false, redirectTo: "/login?next=/admin/access" });
  });

  it("signup pages and public pages stay open; demo workspaces open to anonymous", () => {
    assert.deepEqual(decideRoute("/brand/signup", creator), { allow: true });
    assert.deepEqual(decideRoute("/discover", brand), { allow: true });
    assert.deepEqual(decideRoute("/brand", anon), { allow: true });
    assert.deepEqual(decideRoute("/creator/verification", anon), { allow: false, redirectTo: "/login?next=/creator/verification" });
  });

  it("post-sign-in home goes straight to the role's portal", () => {
    assert.equal(homeFor(admin), "/admin");
    assert.equal(homeFor(brand), "/brand");
    assert.equal(homeFor(creator), "/creator");
    assert.equal(homeFor(anon), "/login");
  });

  it("rejects open redirects in ?next=", () => {
    assert.equal(safeNextPath("//evil.example"), null);
    assert.equal(safeNextPath("https://evil.example"), null);
    assert.equal(safeNextPath("/\\evil"), null);
    assert.equal(safeNextPath("/brand?tab=matches"), "/brand?tab=matches");
  });
});

describe("GSTIN handling (scenario 10)", () => {
  it("accepts a structurally valid GSTIN", () => {
    const r = validateGstinFormat("27aapfu0939f1zv");
    assert.ok(r.valid);
    if (r.valid) {
      assert.equal(r.stateName, "Maharashtra");
      assert.equal(r.pan, "AAPFU0939F");
    }
  });

  it("rejects wrong length, pattern, state code and check digit", () => {
    assert.equal(validateGstinFormat("27AAPFU0939F1Z").valid, false);
    assert.equal(validateGstinFormat("27AAPFU0939F1XV").valid, false);
    const badState = "00AAPFU0939F1Z";
    assert.equal(validateGstinFormat(badState + gstinChecksumChar(badState)).valid, false);
    const r = validateGstinFormat("27AAPFU0939F1ZA");
    assert.equal(r.valid, false);
    if (!r.valid) assert.match(r.error, /check digit/);
  });

  it("flags mismatched registration details honestly", () => {
    const record = { gstin: "27AAPFU0939F1ZV", legalName: "Apex Footwear Private Limited", tradeName: "Apex", status: "Cancelled", stateCode: "27" };
    const mm = compareRegistration({ legalName: "GlowCo Pvt Ltd", tradeName: "GlowCo", stateCode: "27" }, record);
    assert.deepEqual(mm.map((m) => `${m.field}:${m.severity}`), ["legalName:blocking", "tradeName:review", "status:blocking"]);
    const ok = compareRegistration({ legalName: "Apex Footwear Pvt. Ltd." }, { ...record, status: "Active" });
    assert.deepEqual(ok, []);
  });
});

describe("application validators", () => {
  const brand: BrandApplication = {
    contactName: "Priya", legalName: "GlowCo Private Limited", tradeName: "GlowCo", businessType: "private_limited",
    country: "IN", website: "https://glowco.example", representative: { name: "Priya", designation: "Director", email: "p@glowco.example" },
    hasGstin: true, gstin: "27AAPFU0939F1ZV", altEvidenceType: "", registrationNumber: "",
  };
  const creator: CreatorApplication = {
    displayName: "Anya", headline: "AI product films", bio: "I make short-form AI product films for brands.",
    portfolioLinks: ["https://anya.example"], sampleWorkLinks: [], specializations: ["X"], formats: ["9:16"], aiTools: ["Runway"],
    availability: "open", offersCommercialLicense: true, commercialNotes: "", isRegisteredBusiness: false, gstin: "",
  };

  it("valid brand passes; formatted-but-wrong GSTIN fails", () => {
    assert.deepEqual(validateBrandApplication(brand, []), {});
    assert.ok(validateBrandApplication({ ...brand, gstin: "27AAPFU0939F1ZA" }, []).gstin);
  });

  it("GSTIN is optional for brands (any country); if given it must be valid", () => {
    assert.deepEqual(validateBrandApplication({ ...brand, hasGstin: false, gstin: "" }, []), {});
    assert.deepEqual(validateBrandApplication({ ...brand, hasGstin: false, gstin: "", country: "US" }, []), {});
    assert.ok(validateBrandApplication({ ...brand, gstin: "27AAPFU0939F1ZA" }, []).gstin);
  });

  it("creator without GSTIN is valid (scenario 11)", () => {
    assert.deepEqual(validateCreatorApplication(creator, []), {});
  });

  it("creator must show portfolio evidence; non-http links rejected", () => {
    assert.ok(validateCreatorApplication({ ...creator, portfolioLinks: [] }, []).portfolioLinks);
    assert.ok(validateCreatorApplication({ ...creator, portfolioLinks: ["javascript:alert(1)"] }, []).portfolioLinks);
  });
});

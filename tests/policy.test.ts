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
  it("verified brand may invite", () => assert.ok(canPerform("brand.sendInvitation", base).allowed));
  it("unverified, pending, rejected and suspended brands may not", () => {
    for (const status of ["unverified", "pending_review", "rejected", "suspended", "info_required"] as VerificationStatus[]) {
      assert.equal(canPerform("brand.sendInvitation", { ...base, status }).allowed, false, status);
    }
  });
  it("unverified email blocks even a verified status", () => {
    assert.equal(canPerform("brand.sendInvitation", { ...base, emailVerified: false }).allowed, false);
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
    assert.deepEqual(decideRoute("/creator", brand, "verified"), { allow: false, redirectTo: "/brand" });
    assert.deepEqual(decideRoute("/creator-studio", brand, "verified"), { allow: false, redirectTo: "/brand" });
    assert.deepEqual(decideRoute("/admin/verifications", brand), { allow: false, redirectTo: "/admin/access" });
    assert.deepEqual(decideRoute("/brand/verification", brand), { allow: true });
  });

  it("brands must be GSTIN-verified before using the Brand Hub", () => {
    for (const s of ["unverified", "pending_review", "info_required", "rejected", "suspended"] as VerificationStatus[]) {
      assert.deepEqual(decideRoute("/brand", brand, s), { allow: false, redirectTo: "/brand/verification" }, s);
    }
    assert.deepEqual(decideRoute("/brand", brand, "verified"), { allow: true });
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

  it("post-sign-in home follows role and verification state", () => {
    assert.equal(homeFor(admin, "unverified", true), "/admin");
    assert.equal(homeFor(brand, "verified", false), "/verify-email");
    assert.equal(homeFor(brand, "pending_review", true), "/brand/verification");
    assert.equal(homeFor(creator, "verified", true), "/creator");
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

  it("GSTIN is mandatory for brands; non-Indian brands are refused", () => {
    assert.ok(validateBrandApplication({ ...brand, hasGstin: false, gstin: "" }, []).gstin);
    assert.ok(validateBrandApplication({ ...brand, gstin: "" }, []).gstin);
    assert.ok(validateBrandApplication({ ...brand, country: "US" }, []).country);
  });

  it("creator without GSTIN is valid (scenario 11)", () => {
    assert.deepEqual(validateCreatorApplication(creator, []), {});
  });

  it("creator must show portfolio evidence; non-http links rejected", () => {
    assert.ok(validateCreatorApplication({ ...creator, portfolioLinks: [] }, []).portfolioLinks);
    assert.ok(validateCreatorApplication({ ...creator, portfolioLinks: ["javascript:alert(1)"] }, []).portfolioLinks);
  });
});

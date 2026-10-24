/**
 * KreaLink — Firestore & Storage Security Rules tests (emulator)
 * Run: npm run test:rules
 */

import { after, before, beforeEach, describe, it } from "node:test";
import { readFileSync } from "node:fs";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestContext,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  serverTimestamp,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  type Firestore,
} from "firebase/firestore";
import { ref, uploadBytes, getBytes, deleteObject } from "firebase/storage";

let env: RulesTestEnvironment;

const BRAND_APP = {
  contactName: "Priya Rao",
  legalName: "GlowCo Private Limited",
  tradeName: "GlowCo",
  businessType: "private_limited",
  country: "IN",
  website: "https://glowco.example",
  representative: { name: "Priya Rao", designation: "Director", email: "priya@glowco.example" },
  hasGstin: true,
  gstin: "27AAPFU0939F1ZV",
  altEvidenceType: "",
  registrationNumber: "",
};

const CREATOR_APP = {
  displayName: "Anya",
  headline: "AI product films",
  bio: "I make short-form AI product films for skincare and fashion brands.",
  portfolioLinks: ["https://anya.example/reel"],
  sampleWorkLinks: [],
  specializations: ["Product Visualization"],
  formats: ["9:16"],
  aiTools: ["Runway"],
  availability: "open",
  offersCommercialLicense: true,
  commercialNotes: "",
  isRegisteredBusiness: false,
  gstin: "",
};

const CONSENT = { accepted: true, version: "v1", acceptedAt: 1760000000000 };

type Who = { uid: string; email: string; verified?: boolean; mfa?: boolean };

function as(w: Who): RulesTestContext {
  return env.authenticatedContext(w.uid, {
    email: w.email,
    email_verified: w.verified ?? true,
    ...(w.mfa ? { firebase: { sign_in_provider: "password", sign_in_second_factor: "phone" } } : {}),
  } as Record<string, unknown>);
}

const db = (w: Who): Firestore => as(w).firestore() as unknown as Firestore;
const anonDb = (): Firestore => env.unauthenticatedContext().firestore() as unknown as Firestore;

const ADMIN: Who = { uid: "admin-1", email: "ops@krealink.example" };
const ADMIN_MFA: Who = { uid: "admin-mfa", email: "sec@krealink.example" };
const ADMIN_INACTIVE: Who = { uid: "admin-old", email: "old@krealink.example" };
const BRAND: Who = { uid: "brand-aaaa1111", email: "priya@glowco.example" };
const BRAND_V: Who = { uid: "brand-vvvv2222", email: "ops@verified.example" };
const BRAND_UNVERIFIED_EMAIL: Who = { uid: "brand-nnnn3333", email: "new@brand.example", verified: false };
const CREATOR: Who = { uid: "creator-c1", email: "anya@creator.example" };
const CREATOR_V: Who = { uid: "creator-v1", email: "kyle@creator.example" };

async function seed(fn: (d: Firestore) => Promise<void>) {
  await env.withSecurityRulesDisabled(async (ctx) => fn(ctx.firestore() as unknown as Firestore));
}

before(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-krealink",
    firestore: { rules: readFileSync("firestore.rules", "utf8"), host: "127.0.0.1", port: 8080 },
    storage: { rules: readFileSync("storage.rules", "utf8"), host: "127.0.0.1", port: 9199 },
  });
});

after(async () => {
  await env.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await seed(async (d) => {
    await setDoc(doc(d, "admins", ADMIN.uid), { active: true, email: ADMIN.email, requireMfa: false, grantedBy: "script", grantedAt: 1 });
    await setDoc(doc(d, "admins", ADMIN_MFA.uid), { active: true, email: ADMIN_MFA.email, requireMfa: true, grantedBy: "script", grantedAt: 1 });
    await setDoc(doc(d, "admins", ADMIN_INACTIVE.uid), { active: false, email: ADMIN_INACTIVE.email, requireMfa: false, grantedBy: "script", grantedAt: 1 });
    for (const [w, role, brandId] of [
      [BRAND, "brand", "brand-brand-aa"],
      [BRAND_V, "brand", "brand-brand-vv"],
      [BRAND_UNVERIFIED_EMAIL, "brand", "brand-brand-nn"],
      [CREATOR, "creator", undefined],
      [CREATOR_V, "creator", undefined],
    ] as const) {
      await setDoc(doc(d, "users", w.uid), {
        uid: w.uid, role, email: w.email, displayName: w.uid, ...(brandId ? { brandId } : {}), createdAt: 1, updatedAt: 1,
      });
    }
    await setDoc(doc(d, "verifications", BRAND_V.uid), { uid: BRAND_V.uid, role: "brand", status: "verified", application: BRAND_APP, evidence: [], consent: CONSENT, updatedAt: 1 });
    await setDoc(doc(d, "verifications", CREATOR_V.uid), { uid: CREATOR_V.uid, role: "creator", status: "verified", application: CREATOR_APP, evidence: [], consent: CONSENT, updatedAt: 1 });
    await setDoc(doc(d, "verifications", CREATOR.uid), { uid: CREATOR.uid, role: "creator", status: "pending_review", application: CREATOR_APP, evidence: [], consent: CONSENT, updatedAt: 1, submittedAt: 1 });
    await setDoc(doc(d, "brands", "brand-brand-vv"), { name: "Verified Co", ownerUid: BRAND_V.uid });
    await setDoc(doc(d, "brands", "brand-brand-aa"), { name: "GlowCo", ownerUid: BRAND.uid });
    await setDoc(doc(d, "creators", "kyle"), { name: "Kyle", username: "kyle", ownerUid: CREATOR_V.uid });
    await setDoc(doc(d, "creators", "anya"), { name: "Anya", username: "anya", ownerUid: CREATOR.uid });
    await setDoc(doc(d, "creators", "paultrillo"), { name: "Paul Trillo", username: "paultrillo", verified: true });
  });
});

function newUser(w: Who, role: string, extra: Record<string, unknown> = {}) {
  return { uid: w.uid, role, email: w.email, displayName: "Name", createdAt: serverTimestamp(), updatedAt: serverTimestamp(), ...extra };
}

/** Admin decision batch: verification update + audit log, atomically. */
async function decide(w: Who, target: string, from: string, to: string, opts: { audit?: boolean; reason?: string } = {}) {
  const d = db(w);
  const b = writeBatch(d);
  const logRef = doc(collection(d, "auditLogs"));
  b.update(doc(d, "verifications", target), {
    status: to,
    reviewedBy: w.uid,
    reviewedAt: serverTimestamp(),
    decisionReason: opts.reason ?? "Evidence reviewed and matches.",
    lastAuditId: logRef.id,
    updatedAt: serverTimestamp(),
  });
  if (opts.audit !== false) {
    b.set(logRef, { action: "verification.decision", actorUid: w.uid, targetUid: target, fromStatus: from, toStatus: to, reason: opts.reason ?? "Evidence reviewed and matches.", at: serverTimestamp() });
  }
  return b.commit();
}

/* ------------------------------------------------------------------ */

describe("users: roles are self-selected once, never admin", () => {
  it("allows a new account to register as brand or creator", async () => {
    const w: Who = { uid: "fresh-1", email: "fresh@x.example" };
    await assertSucceeds(setDoc(doc(db(w), "users", w.uid), newUser(w, "brand", { brandId: "brand-fresh-1" })));
  });

  it("public signup cannot create an admin role (scenario 6)", async () => {
    const w: Who = { uid: "fresh-2", email: "fresh2@x.example" };
    await assertFails(setDoc(doc(db(w), "users", w.uid), newUser(w, "admin")));
  });

  it("an admin (staff) account cannot also register as a brand or creator", async () => {
    await assertFails(setDoc(doc(db(ADMIN), "users", ADMIN.uid), newUser(ADMIN, "brand", { brandId: "brand-admin-1" })));
    await assertFails(setDoc(doc(db(ADMIN), "users", ADMIN.uid), newUser(ADMIN, "creator")));
  });

  it("cannot create a users doc for someone else or with a different email", async () => {
    const w: Who = { uid: "fresh-3", email: "fresh3@x.example" };
    await assertFails(setDoc(doc(db(w), "users", "someone-else"), newUser({ ...w, uid: "someone-else" }, "brand")));
    await assertFails(setDoc(doc(db(w), "users", w.uid), { ...newUser(w, "creator"), email: "spoof@x.example" }));
  });

  it("cannot change role after creation (scenario 7)", async () => {
    await assertFails(updateDoc(doc(db(CREATOR), "users", CREATOR.uid), { role: "brand", updatedAt: serverTimestamp() }));
  });

  it("cannot read another user's account (scenario 13)", async () => {
    await assertFails(getDoc(doc(db(BRAND), "users", CREATOR.uid)));
    await assertSucceeds(getDoc(doc(db(BRAND), "users", BRAND.uid)));
  });
});

describe("admins: provisioning only, no client writes", () => {
  it("a user cannot grant themselves admin (scenario 6/7)", async () => {
    await assertFails(setDoc(doc(db(BRAND), "admins", BRAND.uid), { active: true, email: BRAND.email, requireMfa: false, grantedBy: "me", grantedAt: 1 }));
  });

  it("even an admin cannot write admin grants from the client (no lock-out by UI action)", async () => {
    await assertFails(setDoc(doc(db(ADMIN), "admins", "new-admin"), { active: true }));
    await assertFails(updateDoc(doc(db(ADMIN), "admins", ADMIN_MFA.uid), { active: false }));
    await assertFails(deleteDoc(doc(db(ADMIN), "admins", ADMIN_MFA.uid)));
  });

  it("a provisioned admin can read their own grant", async () => {
    await assertSucceeds(getDoc(doc(db(ADMIN), "admins", ADMIN.uid)));
  });
});

describe("verifications: applicant submissions", () => {
  it("brand with verified email can submit for review (scenario 1)", async () => {
    await assertSucceeds(setDoc(doc(db(BRAND), "verifications", BRAND.uid), {
      uid: BRAND.uid, role: "brand", status: "pending_review", application: BRAND_APP, evidence: [], consent: CONSENT,
      submittedAt: serverTimestamp(), updatedAt: serverTimestamp(),
    }));
  });

  it("unverified email cannot submit, but may save a draft", async () => {
    const w = BRAND_UNVERIFIED_EMAIL;
    const base = { uid: w.uid, role: "brand", application: BRAND_APP, evidence: [], consent: CONSENT, updatedAt: serverTimestamp() };
    await assertFails(setDoc(doc(db(w), "verifications", w.uid), { ...base, status: "pending_review", submittedAt: serverTimestamp() }));
    await assertSucceeds(setDoc(doc(db(w), "verifications", w.uid), { ...base, status: "unverified" }));
  });

  it("cannot create a verification already marked verified (scenario 7)", async () => {
    await assertFails(setDoc(doc(db(BRAND), "verifications", BRAND.uid), {
      uid: BRAND.uid, role: "brand", status: "verified", application: BRAND_APP, evidence: [], consent: CONSENT, updatedAt: serverTimestamp(),
    }));
  });

  it("cannot apply under a role the account does not hold", async () => {
    await assertFails(setDoc(doc(db(BRAND), "verifications", BRAND.uid), {
      uid: BRAND.uid, role: "creator", status: "pending_review", application: CREATOR_APP, evidence: [], consent: CONSENT,
      submittedAt: serverTimestamp(), updatedAt: serverTimestamp(),
    }));
  });

  it("GSTIN is optional (any country); a provided GSTIN must be well-formed", async () => {
    const base = { uid: BRAND.uid, role: "brand", status: "pending_review", evidence: [], consent: CONSENT, submittedAt: serverTimestamp(), updatedAt: serverTimestamp() };
    const ref_ = doc(db(BRAND), "verifications", BRAND.uid);
    await assertFails(setDoc(ref_, { ...base, application: { ...BRAND_APP, gstin: "NOT-A-GSTIN" } }));
    await assertSucceeds(setDoc(ref_, { ...base, application: { ...BRAND_APP, hasGstin: false, gstin: "", country: "US" } }));
  });

  it("creator without GSTIN can apply (scenario 11)", async () => {
    await env.clearFirestore();
    await seed(async (d) => {
      await setDoc(doc(d, "users", CREATOR.uid), { uid: CREATOR.uid, role: "creator", email: CREATOR.email, displayName: "Anya", createdAt: 1, updatedAt: 1 });
    });
    await assertSucceeds(setDoc(doc(db(CREATOR), "verifications", CREATOR.uid), {
      uid: CREATOR.uid, role: "creator", status: "pending_review", application: CREATOR_APP, evidence: [], consent: CONSENT,
      submittedAt: serverTimestamp(), updatedAt: serverTimestamp(),
    }));
  });

  it("applicant cannot self-approve or edit while pending (scenario 7)", async () => {
    const ref_ = doc(db(CREATOR), "verifications", CREATOR.uid);
    await assertFails(updateDoc(ref_, { status: "verified", updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(ref_, { "application.headline": "Changed", updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(ref_, { reviewedBy: CREATOR.uid, updatedAt: serverTimestamp() }));
  });

  it("applicant cannot read another applicant's verification (scenario 13)", async () => {
    await assertFails(getDoc(doc(db(BRAND), "verifications", CREATOR.uid)));
    await assertFails(getDocs(collection(db(CREATOR), "verifications")));
  });
});

describe("admin decisions (scenario 3, 9)", () => {
  it("admin approves a pending application with an audit entry", async () => {
    await assertSucceeds(decide(ADMIN, CREATOR.uid, "pending_review", "verified"));
  });

  it("decision without audit entry is refused", async () => {
    await assertFails(decide(ADMIN, CREATOR.uid, "pending_review", "verified", { audit: false }));
  });

  it("invalid transitions are refused", async () => {
    await assertFails(decide(ADMIN, CREATOR.uid, "pending_review", "pending_review"));
    await assertFails(decide(ADMIN, CREATOR.uid, "pending_review", "unverified"));
  });

  it("decision needs a reason", async () => {
    await assertFails(decide(ADMIN, CREATOR.uid, "pending_review", "rejected", { reason: "" }));
  });

  it("request info then applicant resubmits", async () => {
    await assertSucceeds(decide(ADMIN, CREATOR.uid, "pending_review", "info_required", { reason: "Add a sample work link." }));
    await assertSucceeds(updateDoc(doc(db(CREATOR), "verifications", CREATOR.uid), {
      status: "pending_review",
      application: { ...CREATOR_APP, sampleWorkLinks: ["https://anya.example/sample"] },
      submittedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }));
  });

  it("inactive admins and non-admins cannot decide", async () => {
    await assertFails(decide(ADMIN_INACTIVE, CREATOR.uid, "pending_review", "verified"));
    await assertFails(decide(BRAND_V, CREATOR.uid, "pending_review", "verified"));
  });

  it("MFA-required admin must have a second factor", async () => {
    await assertFails(decide(ADMIN_MFA, CREATOR.uid, "pending_review", "verified"));
    await assertSucceeds(decide({ ...ADMIN_MFA, mfa: true }, CREATOR.uid, "pending_review", "verified"));
  });

  it("admin cannot decide their own application", async () => {
    await seed(async (d) => {
      await setDoc(doc(d, "verifications", ADMIN.uid), { uid: ADMIN.uid, role: "creator", status: "pending_review", application: CREATOR_APP, evidence: [], consent: CONSENT, updatedAt: 1 });
    });
    await assertFails(decide(ADMIN, ADMIN.uid, "pending_review", "verified"));
  });

  it("audit log is append-only and admin-only", async () => {
    await decide(ADMIN, CREATOR.uid, "pending_review", "verified");
    const logs = await getDocs(collection(db(ADMIN), "auditLogs"));
    const logId = logs.docs[0]!.id;
    await assertFails(updateDoc(doc(db(ADMIN), "auditLogs", logId), { reason: "rewritten" }));
    await assertFails(deleteDoc(doc(db(ADMIN), "auditLogs", logId)));
    await assertFails(getDocs(collection(db(BRAND_V), "auditLogs")));
  });

  it("audit entries cannot be forged with another actor", async () => {
    await assertFails(setDoc(doc(db(ADMIN), "auditLogs", "forged"), {
      action: "verification.decision", actorUid: ADMIN_MFA.uid, targetUid: CREATOR.uid, reason: "x x x", at: serverTimestamp(),
    }));
  });
});

describe("restricted actions (scenarios 4, 5, 8, 12)", () => {
  function invite(brandId: string, ownerUid: string) {
    return {
      ownerUid, brandOwnerUid: ownerUid, brandId, creatorUsername: "kyle", creatorOwnerUid: CREATOR_V.uid,
      campaignTitle: "Launch", message: "Hi", contactEmail: "x@x.example", brandName: "B", status: "Invited",
    };
  }

  it("any non-suspended brand can invite (verification is a badge, not a gate)", async () => {
    await assertSucceeds(setDoc(doc(db(BRAND), "invitations", "inv-1"), invite("brand-brand-aa", BRAND.uid)));
    await assertSucceeds(setDoc(doc(db(BRAND_V), "invitations", "inv-2"), invite("brand-brand-vv", BRAND_V.uid)));
  });

  it("a brand cannot invite on behalf of another brand", async () => {
    await assertFails(setDoc(doc(db(BRAND), "invitations", "inv-x"), { ...invite("brand-brand-vv", BRAND.uid) }));
  });

  it("creator cannot send brand invitations (scenario 5)", async () => {
    await assertFails(setDoc(doc(db(CREATOR_V), "invitations", "inv-3"), invite("brand-brand-vv", CREATOR_V.uid)));
  });

  it("suspended brand loses restricted access (scenario 12)", async () => {
    await assertSucceeds(decide(ADMIN, BRAND_V.uid, "verified", "suspended", { reason: "Chargeback investigation." }));
    await assertFails(setDoc(doc(db(BRAND_V), "invitations", "inv-4"), invite("brand-brand-vv", BRAND_V.uid)));
  });

  it("the invited creator can accept or decline; a suspended creator cannot accept", async () => {
    await seed(async (d) => {
      await setDoc(doc(d, "invitations", "to-anya"), { ...invite("brand-brand-vv", BRAND_V.uid), creatorUsername: "anya", creatorOwnerUid: CREATOR.uid });
      await setDoc(doc(d, "invitations", "to-kyle"), invite("brand-brand-vv", BRAND_V.uid));
    });
    await assertSucceeds(updateDoc(doc(db(CREATOR), "invitations", "to-anya"), { status: "Accepted" }));
    await assertFails(updateDoc(doc(db(CREATOR), "invitations", "to-kyle"), { status: "Accepted" })); // not the recipient
    await seed(async (d) => {
      await setDoc(doc(d, "verifications", CREATOR_V.uid), { uid: CREATOR_V.uid, role: "creator", status: "suspended", application: CREATOR_APP, evidence: [], consent: CONSENT, updatedAt: 1 });
    });
    await assertFails(updateDoc(doc(db(CREATOR_V), "invitations", "to-kyle"), { status: "Accepted" }));
    await assertSucceeds(updateDoc(doc(db(CREATOR_V), "invitations", "to-kyle"), { status: "Declined" }));
  });

  it("third parties cannot read invitations (scenario 13)", async () => {
    await seed(async (d) => { await setDoc(doc(d, "invitations", "to-kyle"), invite("brand-brand-vv", BRAND_V.uid)); });
    await assertFails(getDoc(doc(db(BRAND), "invitations", "to-kyle")));
    await assertFails(getDoc(doc(anonDb(), "invitations", "to-kyle")));
    await assertSucceeds(getDoc(doc(db(CREATOR_V), "invitations", "to-kyle")));
    await assertSucceeds(getDocs(query(collection(db(BRAND_V), "invitations"), where("brandOwnerUid", "==", BRAND_V.uid))));
  });

  it("only participants create and read engagements", async () => {
    const eng = { brandOwnerUid: BRAND_V.uid, creatorOwnerUid: CREATOR.uid, brandId: "brand-brand-vv", creatorUsername: "anya", status: "Accepted" };
    await assertSucceeds(setDoc(doc(db(BRAND_V), "engagements", "e2"), eng));
    await assertFails(setDoc(doc(db(BRAND), "engagements", "e3"), eng)); // not a participant
    await assertFails(getDoc(doc(db(BRAND), "engagements", "e2")));
  });
});

describe("public profiles cannot self-claim verification (scenario 7)", () => {
  it("creator cannot create or flip a verified badge", async () => {
    await assertFails(setDoc(doc(db(CREATOR_V), "creators", "kyle2"), { name: "K", username: "kyle2", ownerUid: CREATOR_V.uid, verified: true }));
    await assertFails(updateDoc(doc(db(CREATOR), "creators", "anya"), { verified: true }));
    await assertSucceeds(updateDoc(doc(db(CREATOR), "creators", "anya"), { bio: "Updated bio" }));
  });

  it("nobody can claim an unowned seeded profile", async () => {
    await assertFails(updateDoc(doc(db(CREATOR), "creators", "paultrillo"), { ownerUid: CREATOR.uid }));
  });

  it("a brand account cannot create a creator profile", async () => {
    await assertFails(setDoc(doc(db(BRAND), "creators", "fakecreator"), { name: "F", username: "fakecreator", ownerUid: BRAND.uid }));
  });

  it("brand doc id must match the owner's account", async () => {
    await assertFails(setDoc(doc(db(BRAND), "brands", "someone-elses-brand"), { name: "X", ownerUid: BRAND.uid }));
    await assertFails(setDoc(doc(db(BRAND), "brands", "brand-brand-aa"), { name: "X", ownerUid: BRAND.uid, verified: true }));
  });

  it("public discovery reads still work anonymously (scenario 14)", async () => {
    await assertSucceeds(getDoc(doc(anonDb(), "creators", "paultrillo")));
    await assertSucceeds(getDocs(collection(anonDb(), "creators")));
    await assertSucceeds(getDoc(doc(anonDb(), "brands", "brand-brand-vv")));
  });
});

describe("storage: evidence is private", () => {
  const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46]);

  async function setStatus(uid: string, status: string) {
    await seed(async (d) => {
      await setDoc(doc(d, "verifications", uid), { uid, role: "brand", status, application: BRAND_APP, evidence: [], consent: CONSENT, updatedAt: 1 });
    });
  }

  it("owner can upload a PDF to their own folder while editable", async () => {
    await setStatus(BRAND.uid, "unverified");
    const s = as(BRAND).storage();
    await assertSucceeds(uploadBytes(ref(s, `verification-evidence/${BRAND.uid}/gst.pdf`), pdf, { contentType: "application/pdf" }));
  });

  it("rejects other folders, wrong types, unverified email and locked applications", async () => {
    await setStatus(BRAND.uid, "unverified");
    const s = as(BRAND).storage();
    await assertFails(uploadBytes(ref(s, `verification-evidence/${CREATOR.uid}/x.pdf`), pdf, { contentType: "application/pdf" }));
    await assertFails(uploadBytes(ref(s, `verification-evidence/${BRAND.uid}/x.html`), pdf, { contentType: "text/html" }));
    await assertFails(uploadBytes(ref(as(BRAND_UNVERIFIED_EMAIL).storage(), `verification-evidence/${BRAND_UNVERIFIED_EMAIL.uid}/x.pdf`), pdf, { contentType: "application/pdf" }));
    await setStatus(BRAND.uid, "pending_review");
    await assertFails(uploadBytes(ref(s, `verification-evidence/${BRAND.uid}/late.pdf`), pdf, { contentType: "application/pdf" }));
  });

  it("only owner and admin can read; other users and anonymous cannot", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await uploadBytes(ref(ctx.storage(), `verification-evidence/${BRAND.uid}/gst.pdf`), pdf, { contentType: "application/pdf" });
    });
    const path = `verification-evidence/${BRAND.uid}/gst.pdf`;
    await assertSucceeds(getBytes(ref(as(BRAND).storage(), path)));
    await assertSucceeds(getBytes(ref(as(ADMIN).storage(), path)));
    await assertFails(getBytes(ref(as(CREATOR).storage(), path)));
    await assertFails(getBytes(ref(env.unauthenticatedContext().storage(), path)));
    await assertFails(deleteObject(ref(as(CREATOR).storage(), path)));
  });
});

describe("pipelineEngagements: shared brand↔creator pipeline (item 5)", () => {
  function eng(creatorId: string, creatorOwnerUid: string, stage = "shortlisted") {
    return {
      id: `brief-1-${creatorId}`, briefId: "brief-1", creatorId, stage, history: [],
      brandOwnerUid: BRAND_V.uid, creatorOwnerUid, versions: [], createdAt: 1, updatedAt: 1,
    };
  }

  it("a brand can open a shared engagement with a real creator; others cannot pose as that brand", async () => {
    await assertSucceeds(setDoc(doc(db(BRAND_V), "pipelineEngagements", "brief-1-kyle"), eng("kyle", CREATOR_V.uid)));
    await assertSucceeds(setDoc(doc(db(BRAND), "pipelineEngagements", "brief-9-kyle"), { ...eng("kyle", CREATOR_V.uid), id: "brief-9-kyle", briefId: "brief-9", brandOwnerUid: BRAND.uid }));
    await assertFails(setDoc(doc(db(BRAND), "pipelineEngagements", "brief-8-kyle"), { ...eng("kyle", CREATOR_V.uid), id: "brief-8-kyle", briefId: "brief-8" }));
    await assertFails(setDoc(doc(db(CREATOR_V), "pipelineEngagements", "brief-7-kyle"), { ...eng("kyle", CREATOR_V.uid), id: "brief-7-kyle", briefId: "brief-7", brandOwnerUid: CREATOR_V.uid }));
  });

  it("creatorOwnerUid must match the creator profile owner", async () => {
    await assertFails(setDoc(doc(db(BRAND_V), "pipelineEngagements", "brief-1-kyle"), eng("kyle", CREATOR.uid)));
  });

  it("only the two participants can read it", async () => {
    await seed(async (d) => { await setDoc(doc(d, "pipelineEngagements", "brief-1-kyle"), eng("kyle", CREATOR_V.uid)); });
    await assertSucceeds(getDoc(doc(db(CREATOR_V), "pipelineEngagements", "brief-1-kyle")));
    await assertSucceeds(getDocs(query(collection(db(BRAND_V), "pipelineEngagements"), where("brandOwnerUid", "==", BRAND_V.uid))));
    await assertFails(getDoc(doc(db(BRAND), "pipelineEngagements", "brief-1-kyle")));
    await assertFails(getDoc(doc(db(CREATOR), "pipelineEngagements", "brief-1-kyle")));
  });

  it("creator can post progress and versions but cannot reassign owners", async () => {
    await seed(async (d) => { await setDoc(doc(d, "pipelineEngagements", "brief-1-kyle"), eng("kyle", CREATOR_V.uid, "production")); });
    const ref_ = doc(db(CREATOR_V), "pipelineEngagements", "brief-1-kyle");
    await assertSucceeds(updateDoc(ref_, { progress: [{ at: 2, by: "creator", note: "Rendering", percent: 50 }], updatedAt: 2 }));
    await assertFails(updateDoc(ref_, { brandOwnerUid: CREATOR_V.uid }));
  });

  it("the creator can accept; a suspended creator cannot accept paid work", async () => {
    await seed(async (d) => { await setDoc(doc(d, "pipelineEngagements", "brief-1-anya"), eng("anya", CREATOR.uid, "contacted")); });
    await assertSucceeds(updateDoc(doc(db(CREATOR), "pipelineEngagements", "brief-1-anya"), { stage: "accepted" }));
    await seed(async (d) => {
      await setDoc(doc(d, "pipelineEngagements", "brief-2-anya"), { ...eng("anya", CREATOR.uid, "contacted"), id: "brief-2-anya", briefId: "brief-2" });
      await setDoc(doc(d, "verifications", CREATOR.uid), { uid: CREATOR.uid, role: "creator", status: "suspended", application: CREATOR_APP, evidence: [], consent: CONSENT, updatedAt: 1 });
    });
    await assertFails(updateDoc(doc(db(CREATOR), "pipelineEngagements", "brief-2-anya"), { stage: "accepted" }));
  });
});

describe("reviews: only from approved engagements, immutable, audited removal", () => {
  function shared(id: string, stage: string) {
    return { id, briefId: "brief-1", creatorId: "kyle", stage, history: [], brandOwnerUid: BRAND_V.uid, creatorOwnerUid: CREATOR_V.uid, versions: [], createdAt: 1, updatedAt: 1 };
  }
  function rv(extra: Record<string, unknown> = {}) {
    return {
      engagementId: "brief-1-kyle", creatorUsername: "kyle", brandName: "Verified Co", brandOwnerUid: BRAND_V.uid,
      campaignTitle: "Launch", comment: "Excellent work, delivered on time.", rating: 5, quality: 5, communication: 4, timeliness: 5,
      createdAt: serverTimestamp(), ...extra,
    };
  }

  beforeEach(async () => {
    await seed(async (d) => {
      await setDoc(doc(d, "pipelineEngagements", "brief-1-kyle"), shared("brief-1-kyle", "accepted_final"));
      await setDoc(doc(d, "pipelineEngagements", "brief-2-kyle"), { ...shared("brief-2-kyle", "production"), briefId: "brief-2" });
    });
  });

  it("verified brand can review an engagement it approved; anyone can read it", async () => {
    await assertSucceeds(setDoc(doc(db(BRAND_V), "reviews", "brief-1-kyle"), rv()));
    await assertSucceeds(getDoc(doc(anonDb(), "reviews", "brief-1-kyle")));
  });

  it("one review per engagement and reviews are immutable", async () => {
    await assertSucceeds(setDoc(doc(db(BRAND_V), "reviews", "brief-1-kyle"), rv()));
    await assertFails(setDoc(doc(db(BRAND_V), "reviews", "brief-1-kyle"), rv({ rating: 1 })));
    await assertFails(updateDoc(doc(db(BRAND_V), "reviews", "brief-1-kyle"), { rating: 1 }));
  });

  it("no reviews before the final delivery is approved", async () => {
    await assertFails(setDoc(doc(db(BRAND_V), "reviews", "brief-2-kyle"), rv({ engagementId: "brief-2-kyle" })));
  });

  it("other brands, the creator and anonymous users cannot review", async () => {
    await assertFails(setDoc(doc(db(BRAND), "reviews", "brief-1-kyle"), rv({ brandOwnerUid: BRAND.uid })));
    await assertFails(setDoc(doc(db(CREATOR_V), "reviews", "brief-1-kyle"), rv({ brandOwnerUid: CREATOR_V.uid })));
    await assertFails(setDoc(doc(anonDb(), "reviews", "brief-1-kyle"), rv()));
  });

  it("ratings must be whole stars 1–5 and match the engagement's creator", async () => {
    const ref_ = doc(db(BRAND_V), "reviews", "brief-1-kyle");
    await assertFails(setDoc(ref_, rv({ rating: 6 })));
    await assertFails(setDoc(ref_, rv({ quality: 0 })));
    await assertFails(setDoc(ref_, rv({ timeliness: 4.5 })));
    await assertFails(setDoc(ref_, rv({ creatorUsername: "anya" })));
    await assertFails(setDoc(ref_, rv({ comment: "ok" })));
  });

  it("admins remove reviews only with an audit entry; others cannot remove", async () => {
    await seed(async (d) => { await setDoc(doc(d, "reviews", "brief-1-kyle"), { ...rv(), createdAt: 1 }); });
    await assertFails(deleteDoc(doc(db(BRAND_V), "reviews", "brief-1-kyle")));
    await assertFails(deleteDoc(doc(db(ADMIN), "reviews", "brief-1-kyle")));
    const d = db(ADMIN);
    const b = writeBatch(d);
    b.set(doc(d, "auditLogs", "review-remove-brief-1-kyle"), { action: "review.remove", actorUid: ADMIN.uid, targetUid: "brief-1-kyle", reason: "Abusive language", at: serverTimestamp() });
    b.delete(doc(d, "reviews", "brief-1-kyle"));
    await assertSucceeds(b.commit());
  });
});

describe("jobs (briefs) and applications: brand posts, creator applies", () => {
  const JOB = {
    brandId: "brand-brand-aa", ownerUid: BRAND.uid, brandName: "GlowCo", campaignName: "Serum launch reel", requirements: "15s vertical",
    contentType: "Short-form Video", style: [], platform: "Instagram", aspectRatio: "9:16", targetAudience: "Gen Z",
    deliverables: ["1x 15s reel"], commercialUse: true, status: "Published",
  };
  function application(extra: Record<string, unknown> = {}) {
    return {
      briefId: "job-1", briefTitle: "Serum launch reel", brandOwnerUid: BRAND.uid, creatorUid: CREATOR.uid,
      creatorUsername: "anya", creatorName: "Anya", pitch: "I make product films like this every week.", status: "applied",
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(), ...extra,
    };
  }

  it("an unverified brand can post a job for its own brand only", async () => {
    await assertSucceeds(setDoc(doc(db(BRAND), "briefs", "job-1"), JOB));
    await assertFails(setDoc(doc(db(BRAND), "briefs", "job-2"), { ...JOB, ownerUid: BRAND_V.uid }));      // can't route applicants elsewhere
    await assertFails(setDoc(doc(db(BRAND), "briefs", "job-3"), { ...JOB, brandId: "brand-brand-vv" })); // not their brand
    await assertFails(setDoc(doc(db(CREATOR), "briefs", "job-4"), { ...JOB, ownerUid: CREATOR.uid }));   // creators don't post jobs
    await assertSucceeds(getDoc(doc(anonDb(), "briefs", "job-1")));                                     // job board is public
  });

  it("a brand cannot reassign a job's owner", async () => {
    await seed(async (d) => { await setDoc(doc(d, "briefs", "job-1"), JOB); });
    await assertFails(updateDoc(doc(db(BRAND), "briefs", "job-1"), { ownerUid: BRAND_V.uid }));
    await assertSucceeds(updateDoc(doc(db(BRAND), "briefs", "job-1"), { requirements: "15s vertical, warm grade" }));
  });

  describe("applications", () => {
    beforeEach(async () => {
      await seed(async (d) => { await setDoc(doc(d, "briefs", "job-1"), JOB); });
    });

    it("a creator with a published profile applies once to the posting brand", async () => {
      await assertSucceeds(setDoc(doc(db(CREATOR), "applications", `job-1_${CREATOR.uid}`), application()));
      await assertFails(setDoc(doc(db(CREATOR), "applications", `job-1_${CREATOR.uid}`), application({ pitch: "Second try at the same job." })));
    });

    it("rejects misrouted, impersonated or invalid applications", async () => {
      const ref_ = doc(db(CREATOR), "applications", `job-1_${CREATOR.uid}`);
      await assertFails(setDoc(ref_, application({ brandOwnerUid: BRAND_V.uid })));   // not the job's owner
      await assertFails(setDoc(ref_, application({ creatorUsername: "kyle" })));      // someone else's profile
      await assertFails(setDoc(ref_, application({ status: "shortlisted" })));        // can't self-shortlist
      await assertFails(setDoc(ref_, application({ pitch: "hi" })));                  // pitch too short
      await assertFails(setDoc(doc(db(CREATOR), "applications", `job-1_${CREATOR_V.uid}`), application())); // id must be own uid
      await assertFails(setDoc(doc(db(BRAND), "applications", `job-1_${BRAND.uid}`), application({ creatorUid: BRAND.uid }))); // brands can't apply
    });

    it("only the posting brand shortlists/declines; the creator can withdraw", async () => {
      await seed(async (d) => { await setDoc(doc(d, "applications", `job-1_${CREATOR.uid}`), { ...application(), createdAt: 1, updatedAt: 1 }); });
      const id = `job-1_${CREATOR.uid}`;
      await assertFails(updateDoc(doc(db(BRAND_V), "applications", id), { status: "shortlisted", updatedAt: serverTimestamp() }));
      await assertFails(updateDoc(doc(db(CREATOR), "applications", id), { status: "shortlisted", updatedAt: serverTimestamp() }));
      await assertSucceeds(updateDoc(doc(db(CREATOR), "applications", id), { status: "withdrawn", updatedAt: serverTimestamp() }));
      await seed(async (d) => { await setDoc(doc(d, "applications", id), { ...application(), createdAt: 1, updatedAt: 1 }); });
      await assertSucceeds(updateDoc(doc(db(BRAND), "applications", id), { status: "shortlisted", updatedAt: serverTimestamp() }));
    });

    it("applications are private to the two parties", async () => {
      await seed(async (d) => { await setDoc(doc(d, "applications", `job-1_${CREATOR.uid}`), { ...application(), createdAt: 1, updatedAt: 1 }); });
      const id = `job-1_${CREATOR.uid}`;
      await assertSucceeds(getDoc(doc(db(BRAND), "applications", id)));
      await assertSucceeds(getDoc(doc(db(CREATOR), "applications", id)));
      await assertFails(getDoc(doc(db(BRAND_V), "applications", id)));
      await assertFails(getDoc(doc(anonDb(), "applications", id)));
      await assertSucceeds(getDocs(query(collection(db(BRAND), "applications"), where("brandOwnerUid", "==", BRAND.uid))));
    });

    it("a suspended creator cannot apply", async () => {
      await seed(async (d) => {
        await setDoc(doc(d, "verifications", CREATOR.uid), { uid: CREATOR.uid, role: "creator", status: "suspended", application: CREATOR_APP, evidence: [], consent: CONSENT, updatedAt: 1 });
      });
      await assertFails(setDoc(doc(db(CREATOR), "applications", `job-1_${CREATOR.uid}`), application()));
    });
  });
});

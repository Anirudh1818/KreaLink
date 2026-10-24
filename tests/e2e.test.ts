/**
 * KreaLink — end-to-end auth & verification flow against the emulators.
 * Uses the real app modules (accountActions, GSTIN route, provisioning script).
 * Run: npm run test:e2e
 */

import { PROJECT } from "./e2e-env"; // must stay first: sets env before firebase init
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import * as fauth from "firebase/auth";
import * as fstore from "firebase/firestore";
import * as fstorage from "firebase/storage";
import * as fb from "../src/lib/firebase";
import * as actions from "../src/lib/auth/accountActions";
import * as route from "../src/app/api/verification/gstin/route";
import type { VerificationDoc } from "../src/lib/auth/schema";

const AUTH_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? "127.0.0.1:9099";
const FS_HOST = process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8080";

const m = { fb, actions, fauth, fstore, route };

async function clearAll() {
  await fetch(`http://${AUTH_HOST}/emulator/v1/projects/${PROJECT}/accounts`, { method: "DELETE" });
  await fetch(`http://${FS_HOST}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: "DELETE" });
}

/** Click the most recent verification link the Auth emulator "sent" to this email. */
async function verifyEmailViaEmulator(email: string) {
  const res = await fetch(`http://${AUTH_HOST}/emulator/v1/projects/${PROJECT}/oobCodes`);
  const { oobCodes } = (await res.json()) as { oobCodes: { email: string; requestType: string; oobLink: string }[] };
  const code = oobCodes.reverse().find((c) => c.email === email && c.requestType === "VERIFY_EMAIL");
  assert.ok(code, `verification email was sent to ${email}`);
  await fetch(code.oobLink);
  const u = m.fb.auth.currentUser!;
  await u.reload();
  await u.getIdToken(true);
}

async function signIn(email: string, password: string) {
  await m.fauth.signOut(m.fb.auth);
  await m.fauth.signInWithEmailAndPassword(m.fb.auth, email, password);
  await m.fb.auth.currentUser!.getIdToken(true);
}

function provision(...args: string[]) {
  return spawnSync(process.execPath, ["--import", "tsx", "scripts/provision-admin.ts", ...args], {
    env: { ...process.env, FIREBASE_PROJECT_ID: PROJECT, FIRESTORE_EMULATOR_HOST: FS_HOST, FIREBASE_AUTH_EMULATOR_HOST: AUTH_HOST },
    encoding: "utf8",
  });
}

async function gstinCall(body: unknown, token?: string, ip = "10.0.0.1") {
  const req = new Request("http://localhost/api/verification/gstin", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  const res = await m.route.POST(req);
  return { status: res.status, data: await res.json() };
}

const BRAND = { email: "priya@glowco.example", password: "brand-pass-123" };
const CREATOR = { email: "anya@creator.example", password: "creator-pass-123" };
const ADMIN = { email: "ops@krealink.example", password: "admin-pass-123" };

before(async () => {
  fauth.connectAuthEmulator(fb.auth, `http://${AUTH_HOST}`, { disableWarnings: true });
  const [h, p] = FS_HOST.split(":");
  fstore.connectFirestoreEmulator(fb.db, h!, Number(p));
  fstorage.connectStorageEmulator(fb.storage, "127.0.0.1", 9199);
  await clearAll();
});

// Close client connections so the test process can exit.
after(async () => {
  await fauth.signOut(fb.auth).catch(() => {});
  await fstore.terminate(fb.db).catch(() => {});
  const { deleteApp } = await import("firebase/app");
  await deleteApp(fb.app).catch(() => {});
});

describe("end-to-end", { concurrency: false }, () => {
  it("1. brand signup → users doc with brand role, brand workspace, verification email", async () => {
    await m.actions.registerMember({ role: "brand", displayName: "Priya Rao", ...BRAND });
    const uid = m.fb.auth.currentUser!.uid;
    const u = await m.fstore.getDoc(m.fstore.doc(m.fb.db, "users", uid));
    assert.equal(u.data()?.role, "brand");
    const b = await m.fstore.getDoc(m.fstore.doc(m.fb.db, "brands", u.data()!.brandId));
    assert.equal(b.data()?.ownerUid, uid);
    assert.equal(b.data()?.verified, undefined);
    assert.equal(m.fb.auth.currentUser!.emailVerified, false);
  });

  it("1b. cannot submit before email verification; can after", async () => {
    const uid = m.fb.auth.currentUser!.uid;
    const application = {
      contactName: "Priya Rao", legalName: "GlowCo Private Limited", tradeName: "GlowCo", businessType: "private_limited" as const,
      country: "IN", website: "https://glowco.example", representative: { name: "Priya Rao", designation: "Director", email: BRAND.email },
      hasGstin: true, gstin: "27AAPFU0939F1ZV", altEvidenceType: "" as const, registrationNumber: "",
    };
    await assert.rejects(m.actions.saveApplication({ uid, role: "brand", application, evidence: [], submit: true, existing: null }));
    await verifyEmailViaEmulator(BRAND.email);
    await m.actions.saveApplication({ uid, role: "brand", application, evidence: [], submit: true, existing: null });
    const v = await m.fstore.getDoc(m.fstore.doc(m.fb.db, "verifications", uid));
    assert.equal(v.data()?.status, "pending_review");
  });

  it("7. editing client data cannot self-verify or change role", async () => {
    const uid = m.fb.auth.currentUser!.uid;
    await assert.rejects(m.fstore.updateDoc(m.fstore.doc(m.fb.db, "verifications", uid), { status: "verified", updatedAt: m.fstore.serverTimestamp() }));
    await assert.rejects(m.fstore.updateDoc(m.fstore.doc(m.fb.db, "users", uid), { role: "creator", updatedAt: m.fstore.serverTimestamp() }));
    await assert.rejects(m.fstore.setDoc(m.fstore.doc(m.fb.db, "admins", uid), { active: true }));
  });

  it("10. GSTIN endpoint: auth required, honest format/provider results, rate limited", async () => {
    const token = await m.fb.auth.currentUser!.getIdToken();
    assert.equal((await gstinCall({ gstin: "27AAPFU0939F1ZV", legalName: "GlowCo" })).status, 401);
    assert.equal((await gstinCall({ gstin: "27AAPFU0939F1ZV", legalName: "GlowCo" }, "not-a-token", "10.0.0.2")).status, 401);
    assert.equal((await gstinCall({ gstin: 42 }, token, "10.0.0.3")).status, 400);

    const bad = await gstinCall({ gstin: "27AAPFU0939F1ZA", legalName: "GlowCo" }, token, "10.0.0.4");
    assert.equal(bad.data.format.valid, false);
    assert.equal(bad.data.verified, false);

    const good = await gstinCall({ gstin: "27AAPFU0939F1ZV", legalName: "GlowCo" }, token, "10.0.0.5");
    assert.equal(good.data.format.valid, true);
    assert.equal(good.data.provider.status, "not_configured");
    assert.equal(good.data.verified, false, "never claims verification without a provider");
    assert.equal(good.data.mode, "manual_review");

    let last = 0;
    for (let i = 0; i < 11; i++) last = (await gstinCall({ gstin: "x", legalName: "GlowCo" }, token, "10.0.0.9")).status;
    assert.equal(last, 429);
  });

  it("2/11. creator signup without GSTIN, verify email, submit portfolio", async () => {
    await m.fauth.signOut(m.fb.auth);
    await m.actions.registerMember({ role: "creator", displayName: "Anya", ...CREATOR });
    await verifyEmailViaEmulator(CREATOR.email);
    const uid = m.fb.auth.currentUser!.uid;
    await m.actions.saveApplication({
      uid, role: "creator", evidence: [], submit: true, existing: null,
      application: {
        displayName: "Anya", headline: "AI product films", bio: "I make short-form AI product films for skincare brands.",
        portfolioLinks: ["https://anya.example/reel"], sampleWorkLinks: [], specializations: ["Product Visualization"], formats: ["9:16"],
        aiTools: ["Runway"], availability: "open", offersCommercialLicense: true, commercialNotes: "", isRegisteredBusiness: false, gstin: "",
      },
    });
    const v = await m.fstore.getDoc(m.fstore.doc(m.fb.db, "verifications", uid));
    assert.equal(v.data()?.status, "pending_review");
  });

  it("5/13. creator cannot read the brand's application or the queue", async () => {
    await assert.rejects(m.fstore.getDocs(m.fstore.collection(m.fb.db, "verifications")));
    await assert.rejects(m.fstore.getDocs(m.fstore.collection(m.fb.db, "auditLogs")));
  });

  it("3. admin access only through the provisioning script", async () => {
    await m.fauth.signOut(m.fb.auth);
    await m.fauth.createUserWithEmailAndPassword(m.fb.auth, ADMIN.email, ADMIN.password);
    await m.fauth.sendEmailVerification(m.fb.auth.currentUser!);

    // Unverified email → refused.
    const early = provision("grant", ADMIN.email, "--by", "E2E test");
    assert.notEqual(early.status, 0);
    assert.match(early.stderr, /not verified/);

    await verifyEmailViaEmulator(ADMIN.email);
    await assert.rejects(m.fstore.getDocs(m.fstore.collection(m.fb.db, "verifications")), "not admin before provisioning");

    const r = provision("grant", ADMIN.email, "--by", "E2E test");
    assert.equal(r.status, 0, r.stderr);
    await signIn(ADMIN.email, ADMIN.password);
    const queue = await m.fstore.getDocs(m.fstore.collection(m.fb.db, "verifications"));
    assert.equal(queue.size, 2);
  });

  it("9. admin approves brand, requests info from creator; both audited", async () => {
    const adminUid = m.fb.auth.currentUser!.uid;
    const queue = await m.fstore.getDocs(m.fstore.collection(m.fb.db, "verifications"));
    const docs = queue.docs.map((d) => d.data() as VerificationDoc);
    const brand = docs.find((d) => d.role === "brand")!;
    const creator = docs.find((d) => d.role === "creator")!;

    const brandUser = await m.fstore.getDoc(m.fstore.doc(m.fb.db, "users", brand.uid));
    await m.actions.decideVerification({
      adminUid, target: brand, to: "verified", reason: "GSTIN certificate matches legal name (manual check).",
      publicProfile: { collection: "brands", id: brandUser.data()!.brandId },
    });
    await m.actions.decideVerification({ adminUid, target: creator, to: "info_required", reason: "Please add a sample work link." });
    await assert.rejects(m.actions.decideVerification({ adminUid, target: { ...creator, status: "info_required" }, to: "verified", reason: "skip review" }));

    const logs = await m.fstore.getDocs(m.fstore.collection(m.fb.db, "auditLogs"));
    assert.ok(logs.docs.filter((d) => d.data().action === "verification.decision").length >= 2);
    const b = await m.fstore.getDoc(m.fstore.doc(m.fb.db, "brands", brandUser.data()!.brandId));
    assert.equal(b.data()?.verified, true);
  });

  it("12. suspended brand: status visible to the owner, restricted again", async () => {
    const adminUid = m.fb.auth.currentUser!.uid;
    const queue = await m.fstore.getDocs(m.fstore.collection(m.fb.db, "verifications"));
    const brand = queue.docs.map((d) => d.data() as VerificationDoc).find((d) => d.role === "brand")!;
    await m.actions.decideVerification({ adminUid, target: brand, to: "suspended", reason: "Payment dispute under investigation." });
    await signIn(BRAND.email, BRAND.password);
    const v = await m.fstore.getDoc(m.fstore.doc(m.fb.db, "verifications", m.fb.auth.currentUser!.uid));
    assert.equal(v.data()?.status, "suspended");
    assert.equal(v.data()?.decisionReason, "Payment dispute under investigation.");
  });

  it("last admin cannot be revoked", async () => {
    const r = provision("revoke", ADMIN.email, "--by", "E2E test");
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /last active admin/);
  });
});

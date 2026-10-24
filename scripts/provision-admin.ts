/**
 * KreaLink — Admin provisioning (trusted operators only)
 * ----------------------------------------------------------------------------
 * The ONLY way to create or revoke admins. There is no public admin signup,
 * and firestore.rules forbid all client writes to admins/{uid}.
 *
 * Requires a service account for the target project:
 *   set GOOGLE_APPLICATION_CREDENTIALS=C:\secure\krealink-admin-sa.json
 *   set FIREBASE_PROJECT_ID=<project-id>
 *
 * Usage:
 *   npm run admin:provision -- list
 *   npm run admin:provision -- grant ops@example.com [--require-mfa] --by "Your Name"
 *   npm run admin:provision -- revoke ops@example.com --by "Your Name" --reason "Left team"
 *
 * The person must already have a KreaLink account with a verified email.
 * Use --require-mfa once Identity Platform MFA is enabled for the project;
 * the rules then refuse admin actions from sessions without a second factor.
 */

import { applicationDefault, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore, type QueryDocumentSnapshot, type Transaction } from "firebase-admin/firestore";

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function fail(msg: string): never {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

async function main() {
  const [command, email] = process.argv.slice(2).filter((a) => !a.startsWith("--") && a !== arg("--by") && a !== arg("--reason"));
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) fail("Set FIREBASE_PROJECT_ID.");
  // Emulator runs (tests) need no credentials; real projects always do.
  const emulator = !!process.env.FIRESTORE_EMULATOR_HOST && !!process.env.FIREBASE_AUTH_EMULATOR_HOST;
  if (!emulator && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    fail("Set GOOGLE_APPLICATION_CREDENTIALS to a service-account key file.");
  }

  initializeApp(emulator ? { projectId } : { credential: applicationDefault(), projectId });
  const db = getFirestore();
  const auth = getAuth();
  const admins = db.collection("admins");

  if (command === "list") {
    const snap = await admins.get();
    for (const d of snap.docs) {
      const a = d.data();
      console.log(`${a.active ? "ACTIVE  " : "inactive"}  ${a.email}  mfa=${a.requireMfa ? "required" : "optional"}  uid=${d.id}`);
    }
    if (snap.empty) console.log("(no admins provisioned)");
    return;
  }

  if (command !== "grant" && command !== "revoke") fail("Command must be list, grant or revoke.");
  if (!email) fail("Provide the account email.");
  const by = arg("--by");
  if (!by) fail('Record who is doing this with --by "Name".');

  const user = await auth.getUserByEmail(email).catch(() => null);
  if (!user) fail(`No KreaLink account for ${email}. They must sign up first.`);

  if (command === "grant") {
    if (!user.emailVerified) fail(`${email} has not verified their email address.`);
    // Keep staff and members separate: admins use dedicated accounts.
    const member = await db.collection("users").doc(user.uid).get();
    if (member.exists) {
      fail(`${email} is registered as a ${member.data()?.role}. Create a separate staff account for admin access.`);
    }
    const requireMfa = process.argv.includes("--require-mfa");
    await db.runTransaction(async (tx: Transaction) => {
      tx.set(admins.doc(user.uid), {
        active: true,
        email: user.email,
        requireMfa,
        grantedBy: by,
        grantedAt: FieldValue.serverTimestamp(),
      });
      tx.create(db.collection("auditLogs").doc(), {
        action: "admin.grant",
        actorUid: `provisioning-script:${by}`,
        targetUid: user.uid,
        reason: requireMfa ? "Admin granted (MFA required)" : "Admin granted",
        at: FieldValue.serverTimestamp(),
      });
    });
    console.log(`✓ ${email} is now an admin${requireMfa ? " (MFA required)" : ""}.`);
    return;
  }

  // revoke — never leave the platform without an active admin.
  const reason = arg("--reason") ?? "Admin revoked";
  await db.runTransaction(async (tx: Transaction) => {
    const active = await tx.get(admins.where("active", "==", true));
    const others = active.docs.filter((d: QueryDocumentSnapshot) => d.id !== user.uid);
    if (others.length === 0) fail("Refusing to revoke the last active admin. Grant another admin first.");
    tx.set(admins.doc(user.uid), { active: false, revokedBy: by, revokedAt: FieldValue.serverTimestamp() }, { merge: true });
    tx.create(db.collection("auditLogs").doc(), {
      action: "admin.revoke",
      actorUid: `provisioning-script:${by}`,
      targetUid: user.uid,
      reason,
      at: FieldValue.serverTimestamp(),
    });
  });
  console.log(`✓ ${email} is no longer an admin.`);
}

main().catch((e) => fail(e instanceof Error ? e.message : String(e)));

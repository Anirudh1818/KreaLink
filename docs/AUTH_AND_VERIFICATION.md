# Authentication, verification and admin access

KreaLink uses **one Firebase Auth project** with role-based access. Three concepts are kept separate:

| Concept | Source of truth | Who can change it |
|---|---|---|
| **Authentication** — who you are | Firebase Auth (`email_verified` claim) | The user (sign-in, email link) |
| **Role** — brand or creator | `users/{uid}.role` | Chosen once at signup, then immutable |
| **Admin** | `admins/{uid}` (`active`, `requireMfa`) | Only `scripts/provision-admin.ts` (Admin SDK) |
| **Verification** — eligibility | `verifications/{uid}.status` | Applicant submits; only admins decide |

`firestore.rules` and `storage.rules` enforce all of this on Google's servers. The UI checks in `src/lib/auth/policy.ts` only shape what people see.

## Verification states

```
unverified ──submit──▶ pending_review ──▶ verified ──▶ suspended ──▶ verified
     ▲                    │  │  │            │                 └──▶ rejected
     │                    │  │  └▶ rejected  └──▶ info_required
info_required ◀───────────┘  └▶ suspended
     │ resubmit ──▶ pending_review          rejected ──▶ info_required (reopen)
```

- **Applicant:** `unverified → pending_review`, `info_required → pending_review`. Requires a verified email.
- **Admin:** see `ADMIN_TRANSITIONS` in `policy.ts`. Every decision needs a reason. The rules also require an `auditLogs` entry written **in the same batch**, which they check with `existsAfter`. Admins can't decide on their own application.
- Being verified is a status, not a role: a verified brand is still a brand.

## Restricted actions

These require role + verified email + `status == verified` (so suspended accounts are blocked):

- Brand: send invitations, start engagements.
- Creator: accept invitations, take part in engagements.
- Nobody can write `verified` / `verification` on their own public `creators` or `brands` doc. Admin decisions mirror the badge there.

Unverified brands can still draft briefs and explore matches. Anonymous visitors can still browse the demo workspaces (`/brand`, `/creator-studio`, `/pipeline`) using local-only data.

## Routes

| Path | Who |
|---|---|
| `/brand/signup`, `/creator/signup` | Public signup (never creates admins) |
| `/verify-email` | Signed-in users |
| `/brand`, `/brand/verification` | Brand role (demo browsing open to anonymous) |
| `/creator`, `/creator/verification`, `/creator-studio` | Creator role (studio demo open to anonymous) |
| `/admin`, `/admin/verifications`, `/admin/audit` | Active admins only |
| `/me` | Account, status, two-step verification setup |

The guard lives in `AppShell` (`decideRoute`). Wrong-role visits are redirected, and nothing renders until the account has loaded.

## Provisioning admins

```bash
set GOOGLE_APPLICATION_CREDENTIALS=C:\secure\krealink-admin-sa.json   # never commit
set FIREBASE_PROJECT_ID=<project-id>
npm run admin:provision -- grant ops@example.com --by "Your Name" --require-mfa
npm run admin:provision -- list
npm run admin:provision -- revoke ops@example.com --by "Your Name" --reason "Left team"
```

- The person must already have an account with a verified email.
- `revoke` refuses to remove the last active admin.
- Grants and revocations are written to `auditLogs`.
- `--require-mfa` makes the rules refuse admin actions from sessions without a second factor. It needs **Identity Platform** with TOTP MFA enabled. Admins enroll on `/me`.

## GSTIN

- `src/lib/auth/gstin.ts` checks structure only: the pattern, the state code and the check digit. **A well-formed GSTIN is not a verified GSTIN.**
- `POST /api/verification/gstin` requires a Firebase ID token and is rate-limited per IP and per user. It returns `provider.status: "not_configured"` and `mode: "manual_review"` until an authorised GSP is integrated in `src/lib/server/gstProvider.ts`. No provider is bundled, and nothing is scraped.
- Businesses without a GSTIN choose an alternative registration (MCA, Udyam, trade licence, foreign registration) and must upload the document.
- Creators never need a GSTIN.

## Evidence and privacy

- Files go to `verification-evidence/{uid}/…` in Storage: PDF/PNG/JPEG/WebP, under 10 MB.
- Only the owner and active admins can read them, and the owner can upload or delete only while the application is editable.
- Files are referenced by path. Admins open them as short-lived object URLs, never as public download URLs, and each view is written to the audit log.
- Retention: delete evidence **90 days after a final decision** using "Delete evidence" in the review panel (audited). This is **manual**; there is no scheduled job yet.
- Applicants see the decision reason, never the reviewer's identity.
- Signup records consent. Applications record a consent version and timestamp.

## Tests

```bash
npm run typecheck
npm run test:unit       # policy, state machine (incl. rules-vs-code drift check), GSTIN, validators
npm run test:security   # legacy simulation suite
npm run test:rules      # Firestore + Storage rules against emulators (needs Java 11+)
npm run test:e2e        # signup → email verify → apply → provision admin → decide → suspend (emulators)
```

## Deploying the rules

The rules are **not deployed automatically**. Check that `.firebaserc` points at the same project as `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, provision at least one admin, then run:

```bash
firebase deploy --only firestore:rules,storage
```

## Engagement pipeline (brief → delivery)

| Brief requirement | Where it lives |
|---|---|
| Ranked, explained matches; sparse-profile and no-strong-match warnings; brief-conflict detection | Brand Hub → Matches (`detectBriefConflicts`, `STRONG_MATCH_THRESHOLD` = 70%) |
| Auto-Shortlist Agent: proposes only creators ≥ 70%; the brand accepts, edits (swaps) or rejects each pick before anything is shortlisted; weak alternatives shown, never auto-added | Brand Hub → Matches, `/pipeline` (`runAutoShortlistForBrief`, `setAgentAction`, `applyAgentDecisions`) |
| Stages: Shortlisted → Contacted → Accepted → **Selected** → Production → Revision → Delivered → Approved | `PIPELINE_STAGES` |
| Selection confirms scope, timeline, requirements and **locks the agreed licence** on the engagement (blocking mismatches need a written resolution) | `SelectionPanel`, `selectCreator`, `buildAgreedLicense` |
| Creators record the licence terms they offer | Creator Studio → Licensing (`creators/{username}.licenseOffer`) |
| Production updates visible to the brand | Creator Studio → Active Engagements (`addProgressUpdate`) |
| Revisions: feedback tied to a version with its requester; next version records what it answers; rounds go requested → in progress → submitted → approved | `requestRevision`, `startRevision`, `submitVersion` |
| Next-step prompts for brand and creator at every stage | `nextStepFor` / `NextStepBanner` |
| Cross-device sync between a real brand and a real creator | `pipelineEngagements/{id}` (participants only; see rules), `firestoreSync.ts` |

Demo engagements with seeded creators (no owner account) stay in the browser so the full journey can be shown without accounts.

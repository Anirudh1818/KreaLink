/**
 * KreaLink — engagement pipeline logic (selection, licensing, progress,
 * agent proposals, robustness, revision history, next steps).
 * Run: npm run test:unit
 */

import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";

// In-memory localStorage for the stores.
const mem = new Map<string, string>();
(globalThis as unknown as { localStorage: Storage }).localStorage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, v),
  removeItem: (k: string) => void mem.delete(k),
  clear: () => mem.clear(),
  key: () => null,
  length: 0,
} as Storage;

import type { CreativeBrief, CreatorProfile } from "../src/lib/types";
import { DEMO_BRIEFS } from "../src/lib/demoData";
import {
  PIPELINE_STAGES,
  STRONG_MATCH_THRESHOLD,
  addProgressUpdate,
  advanceStage,
  applyAgentDecisions,
  buildAgreedLicense,
  compareLicensesForBrief,
  createVersion,
  detectBriefConflicts,
  getAgentResult,
  getCreatorOffer,
  getEngagement,
  getVersions,
  nextStepFor,
  offerSource,
  registerCreatorOffers,
  requestRevision,
  runAutoShortlistForBrief,
  saveCreatorOffer,
  selectCreator,
  setAgentAction,
  shortlistCreator,
  startRevision,
  submitVersion,
} from "../src/lib/r2";
import { registerCloudWriter } from "../src/lib/r2/cloudQueue";

const BRIEF: CreativeBrief = DEMO_BRIEFS[0]!; // 9:16 Instagram/TikTok, commercial

beforeEach(() => mem.clear());

describe("engagement stages", () => {
  it("include Selection between Accepted and Production", () => {
    const i = PIPELINE_STAGES.indexOf("selected");
    assert.equal(PIPELINE_STAGES[i - 1], "accepted");
    assert.equal(PIPELINE_STAGES[i + 1], "production");
  });
});

describe("selection locks scope, timeline, requirements and licence (items 2 & 3)", () => {
  it("records confirmed terms and the agreed licence on the engagement", () => {
    const e = shortlistCreator(BRIEF.id!, "nicolasneubert", { brief: BRIEF });
    advanceStage(e.id, "accepted", "", "creator");
    const agreed = buildAgreedLicense(BRIEF, "nicolasneubert", "Creator agreed in writing to worldwide rights");
    assert.ok(agreed.mismatches.some((m) => m.field === "territory" && m.severity === "blocking"));
    selectCreator(e.id, { scope: "1x 30s hero video", timeline: "2 weeks", requirements: "9:16, 30s", agreedLicense: agreed });
    const after = getEngagement(e.id)!;
    assert.equal(after.stage, "selected");
    assert.equal(after.scope, "1x 30s hero video");
    assert.equal(after.agreedLicense?.overrideNote, "Creator agreed in writing to worldwide rights");
    assert.equal(after.agreedLicense?.terms.territory, "worldwide");
    // Terms stay attached through later stages.
    advanceStage(e.id, "production", "", "creator");
    advanceStage(e.id, "delivered", "", "creator");
    assert.equal(getEngagement(e.id)!.agreedLicense?.terms.territory, "worldwide");
  });
});

describe("creator licence offers (item 4)", () => {
  it("creator-published terms override demo and default terms", () => {
    assert.equal(offerSource("brandnewcreator"), "default");
    assert.equal(offerSource("nicolasneubert"), "demo");
    saveCreatorOffer("nicolasneubert", { usageType: "commercial", territory: "worldwide", duration: "2year", platforms: ["Instagram", "TikTok"], exclusivity: "non-exclusive" });
    assert.equal(offerSource("nicolasneubert"), "creator");
    assert.equal(compareLicensesForBrief(BRIEF, "nicolasneubert").compatible, true);
  });

  it("offers published on profiles are registered for licence checks", () => {
    const profile = { username: "freshcreator", licenseOffer: { usageType: "editorial", territory: "regional", duration: "6month", platforms: ["Instagram"], exclusivity: "non-exclusive" } } as Pick<CreatorProfile, "username" | "licenseOffer">;
    registerCreatorOffers([profile]);
    assert.equal(getCreatorOffer("freshcreator").territory, "regional");
    assert.equal(compareLicensesForBrief(BRIEF, "freshcreator").compatible, false);
  });
});

describe("production updates (item 6)", () => {
  it("creator updates are recorded with clamped percent", () => {
    const e = shortlistCreator(BRIEF.id!, "paultrillo", {});
    addProgressUpdate(e.id, "Storyboard locked", 30);
    addProgressUpdate(e.id, "Rendering", 150);
    const p = getEngagement(e.id)!.progress!;
    assert.deepEqual(p.map((x) => x.percent), [30, 100]);
    assert.equal(p[0]!.by, "creator");
  });
});

describe("robust matching (item 7)", () => {
  it("detects contradictory briefs", () => {
    const bad: CreativeBrief = { ...BRIEF, aspectRatio: "16:9 Landscape", platform: "Instagram Reels & TikTok", commercialUse: false, notes: "For paid ads" };
    const c = detectBriefConflicts(bad);
    assert.ok(c.some((x) => x.includes("16:9")));
    assert.ok(c.some((x) => x.includes("commercial rights")));
    assert.deepEqual(detectBriefConflicts(BRIEF), []);
  });

  it("proposes only creators above the threshold; none for an unmatched brief", () => {
    const r = runAutoShortlistForBrief(BRIEF);
    assert.ok(r.actions.length > 0 && r.actions.length <= 5);
    assert.ok(r.actions.every((a) => (a.score ?? 0) >= STRONG_MATCH_THRESHOLD));

    const sparse: CreatorProfile = {
      name: "Sparse", username: "sparse", bio: "", specialization: "Pottery photography", skills: [], aiTools: [], aiModels: [],
      contentTypes: ["Still photography"], formats: ["1:1"], commercialUse: false, availability: "Busy",
    };
    const none = runAutoShortlistForBrief({ ...BRIEF, id: "brief-none" }, [sparse]);
    assert.equal(none.actions.length, 0);
    assert.equal(none.strongMatchFound, false);
    assert.equal(none.weakAlternatives?.[0]?.creatorId, "sparse");
    assert.match(none.summary, /No strong match/);
  });
});

describe("agent proposals: accept / edit / reject (item 8)", () => {
  it("nothing is shortlisted until the brand applies decisions", () => {
    const r = runAutoShortlistForBrief(BRIEF);
    assert.equal(getEngagement(`${BRIEF.id}-${r.actions[0]!.creatorId}`), undefined);
    const [a, b, c] = r.actions;
    setAgentAction(BRIEF.id!, a!.id, "accepted");
    setAgentAction(BRIEF.id!, b!.id, "rejected");
    setAgentAction(BRIEF.id!, c!.id, "edited", { creatorId: "swapped-in", score: 71, reason: "brand pick", editedValue: "prefer this style" });
    applyAgentDecisions(BRIEF.id!, BRIEF, () => ({ brandOwnerUid: "brand-uid" }));
    assert.ok(getEngagement(`${BRIEF.id}-${a!.creatorId}`));
    assert.equal(getEngagement(`${BRIEF.id}-${b!.creatorId}`), undefined);
    const swapped = getEngagement(`${BRIEF.id}-swapped-in`);
    assert.ok(swapped);
    assert.equal(swapped!.brandOwnerUid, "brand-uid");
    const stored = getAgentResult(BRIEF.id!)!;
    assert.equal(stored.applied, true);
    assert.equal(stored.actions.find((x) => x.id === c!.id)!.originalCreatorId, c!.creatorId);
  });

  it("prompts each side about its next step", () => {
    const e = shortlistCreator(BRIEF.id!, "paultrillo", {});
    assert.equal(nextStepFor(e, "brand")!.action, true);
    advanceStage(e.id, "contacted");
    const contacted = getEngagement(e.id)!;
    assert.equal(nextStepFor(contacted, "creator")!.action, true);
    assert.equal(nextStepFor(contacted, "brand")!.action, false);
  });
});

describe("revision history: who requested, what changed, round status (item 9)", () => {
  it("records requester, the feedback answered, and in-progress status", () => {
    const e = shortlistCreator(BRIEF.id!, "paultrillo", {});
    const v1 = createVersion(e.id, "Initial cut", undefined, undefined, { submittedBy: "@paultrillo" });
    submitVersion(v1.id, "/v1.mp4");
    requestRevision(v1.id, "Warmer colour grade", "brand", "Apex Athletics");
    const v2 = startRevision(e.id, "@paultrillo");
    assert.equal(v2.status, "in_progress");
    assert.equal(v2.respondsTo?.versionN, 1);
    assert.equal(v2.respondsTo?.requestedBy, "Apex Athletics");
    assert.equal(v2.respondsTo?.feedback, "Warmer colour grade");
    submitVersion(v2.id, "/v2.mp4", undefined, "Warmer grade applied");
    const vs = getVersions(e.id);
    assert.deepEqual(vs.map((v) => v.status), ["requested", "submitted"]);
    assert.equal(vs[0]!.feedback[0]!.authorName, "Apex Athletics");
    assert.equal(vs[1]!.changeLog, "Warmer grade applied");
  });
});

describe("cloud sync hook (item 5)", () => {
  it("queues every engagement and version change for Firestore", () => {
    const pushed: string[] = [];
    registerCloudWriter((id) => pushed.push(id));
    const e = shortlistCreator(BRIEF.id!, "paultrillo", { brandOwnerUid: "b", creatorOwnerUid: "c" });
    addProgressUpdate(e.id, "Started", 10);
    createVersion(e.id, "Initial cut");
    registerCloudWriter(null);
    assert.ok(pushed.length >= 3);
    assert.ok(pushed.every((id) => id === e.id));
  });
});

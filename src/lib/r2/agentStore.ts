/**
 * KreaLink R2 — Auto-Shortlist Agent
 * Builds a shortlist from a brief + creators.
 * Stores the action log so the brand can accept, edit or reject.
 */

import type { AgentAction, AgentShortlistResult } from "./types";
import { rankCreatorsForBrief2 } from "@/lib/ai/matchingEngine2";
import type { StructuredBrief2 } from "@/lib/ai/schemas";
import type { CreativeBrief, CreatorProfile } from "@/lib/types";
import { DEMO_CREATORS } from "@/lib/demoData";
import { shortlistCreator } from "./engagementStore";
import { notifyR2Change } from "./events";

const LS_KEY = "krealink-agent-results";

function loadAll(): AgentShortlistResult[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as AgentShortlistResult[]) : [];
  } catch {
    return [];
  }
}

function saveAll(all: AgentShortlistResult[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(all));
  } catch { /* ignore */ }
  notifyR2Change();
}

export function getAgentResult(briefId: string): AgentShortlistResult | undefined {
  return loadAll().find((r) => r.briefId === briefId);
}

/** Convert a StructuredBrief2 to the legacy CreativeBrief shape for the matching engine. */
function toCreativeBrief(b: StructuredBrief2, briefId: string): CreativeBrief {
  return {
    id: briefId,
    brandId: "brand-demo",
    brandName: "KreaLink Demo Brand",
    campaignName: b.campaignName,
    requirements: b.skillsRequired.join(", "),
    contentType: b.contentType,
    platform: b.platforms.join(", "),
    style: b.style,
    aspectRatio: b.aspectRatio,
    targetAudience: b.targetAudience,
    deliverables: b.deliverables,
    commercialUse: b.commercialUse,
    notes: b.additionalNotes,
    status: "Published",
  };
}

/** Flatten demo creators to plain CreatorProfile array. */
export function flatCreators(): CreatorProfile[] {
  return DEMO_CREATORS.map((d) => d.creator);
}

/** Run the agent: rank all demo creators against the brief, return top-5 actions. */
export async function runAutoShortlist(
  briefId: string,
  brief: StructuredBrief2
): Promise<AgentShortlistResult> {
  return runAutoShortlistForBrief(toCreativeBrief(brief, briefId));
}

/** Run the agent against an already-structured CreativeBrief. */
export function runAutoShortlistForBrief(
  creativeBrief: CreativeBrief,
  creators: CreatorProfile[] = flatCreators()
): AgentShortlistResult {
  const briefId = creativeBrief.id ?? "brief-draft";
  const ranked = rankCreatorsForBrief2(creativeBrief, creators);

  const actions: AgentAction[] = ranked.slice(0, 5).map((match, i) => ({
    id: `action-${briefId}-${match.creator.username}-${i}`,
    type: "shortlist",
    description: `Shortlist @${match.creator.username} (${match.overallScore}% match)`,
    creatorId: match.creator.username,
    score: match.overallScore,
    reason: match.whyExplanation,
    status: "pending",
  }));

  // Summary line
  const top = ranked[0];
  const summary = top
    ? `Agent ranked ${ranked.length} creators. Top match: @${top.creator.username} at ${top.overallScore}%.`
    : "No strong matches found for this brief.";

  const nextStep =
    ranked.length === 0
      ? "Broaden the brief or add more creators to the talent pool."
      : "Review the shortlist, then accept or edit individual actions to proceed.";

  const result: AgentShortlistResult = {
    briefId,
    actions,
    summary,
    createdAt: Date.now(),
    nextStep,
  };

  const all = loadAll();
  const idx = all.findIndex((r) => r.briefId === briefId);
  if (idx >= 0) all[idx] = result;
  else all.push(result);
  saveAll(all);

  return result;
}

/** Apply accepted actions (auto-shortlist creators in the engagement store). */
export function applyAcceptedActions(result: AgentShortlistResult, brief?: CreativeBrief): void {
  for (const action of result.actions) {
    if (action.status === "accepted" && action.type === "shortlist" && action.creatorId) {
      shortlistCreator(result.briefId, action.creatorId, {
        campaignTitle: brief?.campaignName,
        brandName: brief?.brandName,
        matchScore: action.score,
        brief,
      });
    }
  }
}

/** Accept every pending action and shortlist those creators in one go. */
export function acceptAllAndApply(result: AgentShortlistResult, brief?: CreativeBrief): AgentShortlistResult {
  const accepted: AgentShortlistResult = {
    ...result,
    actions: result.actions.map((a) => (a.status === "pending" ? { ...a, status: "accepted" } : a)),
  };
  const all = loadAll();
  const idx = all.findIndex((r) => r.briefId === result.briefId);
  if (idx >= 0) all[idx] = accepted;
  else all.push(accepted);
  saveAll(all);
  applyAcceptedActions(accepted, brief);
  return accepted;
}

/** Update a single action status. */
export function updateAction(
  briefId: string,
  actionId: string,
  status: AgentAction["status"],
  editedValue?: string
): void {
  const all = loadAll();
  const rIdx = all.findIndex((r) => r.briefId === briefId);
  if (rIdx < 0) return;
  const aIdx = all[rIdx]!.actions.findIndex((a) => a.id === actionId);
  if (aIdx < 0) return;
  all[rIdx]!.actions[aIdx] = { ...all[rIdx]!.actions[aIdx]!, status, editedValue };
  saveAll(all);
}

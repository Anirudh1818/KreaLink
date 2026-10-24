/**
 * KreaLink R2 — Auto-Shortlist Agent
 * Proposes a shortlist from a brief + creators. Nothing reaches the pipeline
 * until the brand accepts (or edits) individual proposals.
 * Only creators at or above STRONG_MATCH_THRESHOLD are proposed; weaker
 * candidates are reported as alternatives, never auto-shortlisted.
 */

import type { AgentAction, AgentShortlistResult, EngagementMeta, WeakAlternative } from "./types";
import { STRONG_MATCH_THRESHOLD } from "./types";
import { detectBriefConflicts } from "./briefChecks";
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

/** Run the agent: rank all demo creators against the brief, return proposals. */
export async function runAutoShortlist(
  briefId: string,
  brief: StructuredBrief2
): Promise<AgentShortlistResult> {
  return runAutoShortlistForBrief(toCreativeBrief(brief, briefId));
}

function persist(result: AgentShortlistResult): AgentShortlistResult {
  const all = loadAll();
  const idx = all.findIndex((r) => r.briefId === result.briefId);
  if (idx >= 0) all[idx] = result;
  else all.push(result);
  saveAll(all);
  return result;
}

/** Rank creators against an already-structured brief and record proposals (pending). */
export function runAutoShortlistForBrief(
  creativeBrief: CreativeBrief,
  creators: CreatorProfile[] = flatCreators()
): AgentShortlistResult {
  const briefId = creativeBrief.id ?? "brief-draft";
  const ranked = rankCreatorsForBrief2(creativeBrief, creators);
  const conflicts = detectBriefConflicts(creativeBrief);
  const strong = ranked.filter((m) => m.overallScore >= STRONG_MATCH_THRESHOLD).slice(0, 5);

  const actions: AgentAction[] = strong.map((match, i) => ({
    id: `action-${briefId}-${match.creator.username}-${i}`,
    type: "shortlist",
    description: `Shortlist @${match.creator.username} (${match.overallScore}% match)`,
    creatorId: match.creator.username,
    score: match.overallScore,
    reason:
      match.confidence === "LOW" || match.evidenceCount === 0
        ? `${match.whyExplanation} Note: sparse profile — limited portfolio evidence, verify before contacting.`
        : match.whyExplanation,
    status: "pending",
  }));

  const weakAlternatives: WeakAlternative[] =
    strong.length === 0
      ? ranked.slice(0, 3).map((m) => ({
          creatorId: m.creator.username,
          score: m.overallScore,
          reason: m.gaps[0]?.message ?? m.whyNotExplanation ?? m.whyExplanation,
        }))
      : [];

  const top = ranked[0];
  const summary =
    strong.length > 0
      ? `Ranked ${ranked.length} creators; ${strong.length} meet the ${STRONG_MATCH_THRESHOLD}% bar. Top match: @${top!.creator.username} at ${top!.overallScore}%.`
      : top
      ? `No strong match: the best creator scores ${top.overallScore}%, below the ${STRONG_MATCH_THRESHOLD}% bar. Nothing was shortlisted automatically.`
      : "No creators available to rank for this brief.";

  const nextStep =
    conflicts.length > 0
      ? "Resolve the conflicting requirements in the brief, then re-run the agent."
      : strong.length === 0
      ? "Broaden the brief (style, tools or format) or review the closest alternatives manually."
      : "Review each proposal: accept, swap for another creator, or reject. Accepted creators join your shortlist.";

  return persist({
    briefId,
    actions,
    summary,
    createdAt: Date.now(),
    nextStep,
    strongMatchFound: strong.length > 0,
    weakAlternatives,
    conflicts,
    applied: false,
  });
}

/** Brand decision on one proposal: accept, reject, or edit (swap creator / add a note). */
export function setAgentAction(
  briefId: string,
  actionId: string,
  status: AgentAction["status"],
  edit: { editedValue?: string; creatorId?: string; score?: number; reason?: string } = {}
): AgentShortlistResult | null {
  const result = getAgentResult(briefId);
  if (!result) return null;
  const actions = result.actions.map((a) => {
    if (a.id !== actionId) return a;
    const swapped = edit.creatorId && edit.creatorId !== a.creatorId;
    return {
      ...a,
      status,
      ...(edit.editedValue !== undefined ? { editedValue: edit.editedValue } : {}),
      ...(swapped
        ? {
            originalCreatorId: a.originalCreatorId ?? a.creatorId,
            creatorId: edit.creatorId,
            score: edit.score,
            reason: edit.reason,
            description: `Shortlist @${edit.creatorId}${edit.score !== undefined ? ` (${edit.score}% match)` : ""} — swapped by brand`,
          }
        : {}),
    };
  });
  return persist({ ...result, actions });
}

/** Write accepted / edited proposals to the pipeline as shortlisted engagements. */
export function applyAgentDecisions(
  briefId: string,
  brief: CreativeBrief,
  metaFor: (creatorId: string) => EngagementMeta = () => ({})
): AgentShortlistResult | null {
  const result = getAgentResult(briefId);
  if (!result) return null;
  for (const a of result.actions) {
    if ((a.status === "accepted" || a.status === "edited") && a.type === "shortlist" && a.creatorId) {
      shortlistCreator(briefId, a.creatorId, {
        campaignTitle: brief.campaignName,
        brandName: brief.brandName,
        matchScore: a.score,
        brief,
        ...metaFor(a.creatorId),
      });
    }
  }
  return persist({ ...result, applied: true });
}

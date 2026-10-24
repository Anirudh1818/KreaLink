/**
 * KreaLink R2 — next-step prompts
 * The agent's guidance for each side of an engagement, derived from its stage.
 */

import type { Engagement } from "./types";

export type Side = "brand" | "creator";
export type NextStep = { text: string; owner: Side; waitingText: string };

const STEPS: Partial<Record<Engagement["stage"], NextStep>> = {
  shortlisted: { owner: "brand", text: "Contact this creator to invite them to the brief.", waitingText: "The brand is reviewing its shortlist." },
  contacted: { owner: "creator", text: "Accept or decline the brand's invitation.", waitingText: "Waiting for the creator to respond." },
  accepted: { owner: "brand", text: "Select this creator and confirm scope, timeline, requirements and licence terms.", waitingText: "Waiting for the brand to confirm selection." },
  selected: { owner: "creator", text: "Review the confirmed scope and licence, then start production.", waitingText: "Waiting for the creator to start production." },
  production: { owner: "creator", text: "Post a progress update or submit your first version.", waitingText: "Creator is in production — watch for updates." },
  changes_requested: { owner: "creator", text: "Start the revision and submit a new version that addresses the feedback.", waitingText: "Waiting for the creator's revised version." },
  delivered: { owner: "brand", text: "Review the delivered version: approve it or request changes.", waitingText: "Waiting for the brand's review." },
};

/** What `side` should do now, or what it's waiting on. Null when finished. */
export function nextStepFor(eng: Engagement, side: Side): { action: boolean; text: string } | null {
  const step = STEPS[eng.stage];
  if (!step) return null;
  return step.owner === side ? { action: true, text: step.text } : { action: false, text: step.waitingText };
}

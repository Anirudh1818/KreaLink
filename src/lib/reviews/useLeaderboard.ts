"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { DEMO_CREATORS } from "@/lib/demoData";
import { computeRanking, nextPickAt, weeklyHistory, type RankInputCreator } from "./ranking";
import { useAllReviews } from "./store";

/** Seeded creators plus creators who published a profile on the platform. */
function useRankableCreators(): RankInputCreator[] {
  const [remote, setRemote] = useState<RankInputCreator[]>([]);
  useEffect(
    () =>
      onSnapshot(
        collection(db, "creators"),
        (snap) =>
          setRemote(
            snap.docs.map((d) => {
              const x = d.data();
              return {
                username: String(x.username ?? d.id),
                name: String(x.name ?? d.id),
                specialization: String(x.specialization ?? "AI Creator"),
                profilePhoto: typeof x.profilePhoto === "string" && x.profilePhoto.startsWith("http") ? x.profilePhoto : undefined,
                verified: x.verified === true,
                portfolioCount: 1,
              };
            })
          ),
        () => setRemote([])
      ),
    []
  );
  return useMemo(() => {
    const map = new Map<string, RankInputCreator>();
    for (const d of DEMO_CREATORS) {
      map.set(d.creator.username.toLowerCase(), {
        username: d.creator.username,
        name: d.creator.name,
        specialization: d.creator.specialization,
        profilePhoto: d.creator.profilePhoto,
        verified: d.creator.verified,
        portfolioCount: d.portfolio.length,
      });
    }
    for (const c of remote) if (!map.has(c.username.toLowerCase())) map.set(c.username.toLowerCase(), c);
    return [...map.values()];
  }, [remote]);
}

/** Ticking clock so the weekly pick rolls over without a reload. */
function useNow(intervalMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

export function useLeaderboard() {
  const creators = useRankableCreators();
  const { reviews, loading } = useAllReviews();
  const now = useNow();
  const history = useMemo(() => weeklyHistory(creators, reviews, now, 4), [creators, reviews, now]);
  const live = useMemo(() => computeRanking(creators, reviews, now + 1), [creators, reviews, now]);
  return { current: history[0]!, past: history.slice(1), live, reviews, loading, now, nextPick: nextPickAt(now) };
}

/** This week's Top 10 rank for a creator, or null. */
export function useWeeklyRank(username: string): number | null {
  const { current } = useLeaderboard();
  return current.top.find((t) => t.username.toLowerCase() === username.toLowerCase())?.rank ?? null;
}

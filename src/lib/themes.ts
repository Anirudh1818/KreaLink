export type ThemeKey = "flame" | "social" | "royal" | "neon";

export type FanStreakTheme = {
  name: string;
  label: string;
  description: string;
  gradient: string;
  softGradient: string;
  glow: string;
  border: string;
  text: string;
};

export const themes: Record<ThemeKey, FanStreakTheme> = {
  flame: {
    name: "FanStreak Flame",
    label: "Default",
    description: "Pink-orange creator energy built for premium fandom pages.",
    gradient: "linear-gradient(135deg, #ec4899, #f43f5e, #f97316)",
    softGradient:
      "linear-gradient(135deg, rgba(236,72,153,0.24), rgba(244,63,94,0.14), rgba(249,115,22,0.22))",
    glow: "rgba(236,72,153,0.35)",
    border: "rgba(236,72,153,0.55)",
    text: "linear-gradient(90deg, #f9a8d4, #fda4af, #fdba74)",
  },

  social: {
    name: "Social Glow",
    label: "Insta-style",
    description: "Familiar pink-purple-orange social profile energy.",
    gradient: "linear-gradient(135deg, #f58529, #dd2a7b, #8134af, #515bd4)",
    softGradient:
      "linear-gradient(135deg, rgba(245,133,41,0.22), rgba(221,42,123,0.20), rgba(129,52,175,0.18), rgba(81,91,212,0.18))",
    glow: "rgba(221,42,123,0.38)",
    border: "rgba(221,42,123,0.55)",
    text: "linear-gradient(90deg, #fbbf24, #fb7185, #c084fc, #818cf8)",
  },

  royal: {
    name: "Royal Circle",
    label: "Premium",
    description: "Purple-gold celebrity look for high-status fan communities.",
    gradient: "linear-gradient(135deg, #7c3aed, #c026d3, #f59e0b)",
    softGradient:
      "linear-gradient(135deg, rgba(124,58,237,0.24), rgba(192,38,211,0.16), rgba(245,158,11,0.20))",
    glow: "rgba(192,38,211,0.34)",
    border: "rgba(245,158,11,0.45)",
    text: "linear-gradient(90deg, #c4b5fd, #f0abfc, #fde68a)",
  },

  neon: {
    name: "Neon Arena",
    label: "Live",
    description: "Electric green-blue theme for streamers, gamers and live creators.",
    gradient: "linear-gradient(135deg, #10b981, #06b6d4, #3b82f6)",
    softGradient:
      "linear-gradient(135deg, rgba(16,185,129,0.22), rgba(6,182,212,0.18), rgba(59,130,246,0.18))",
    glow: "rgba(6,182,212,0.35)",
    border: "rgba(6,182,212,0.55)",
    text: "linear-gradient(90deg, #6ee7b7, #67e8f9, #93c5fd)",
  },
};

export function isThemeKey(value: string | null): value is ThemeKey {
  return value === "flame" || value === "social" || value === "royal" || value === "neon";
}

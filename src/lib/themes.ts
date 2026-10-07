export type ThemeKey = "flame" | "social" | "royal" | "neon";

export type KreaLinkTheme = {
  name: string;
  label: string;
  description: string;
  gradient: string;
  softGradient: string;
  glow: string;
  border: string;
  text: string;
  accent: string;
};

export type FanStreakTheme = KreaLinkTheme;

export const themes: Record<ThemeKey, KreaLinkTheme> = {
  flame: {
    name: "Cyber Indigo",
    label: "AI Flagship",
    description: "Electric indigo and surgical violet engineered for high-performance generative AI platforms.",
    gradient: "linear-gradient(135deg, #6366f1, #8b5cf6, #7c3aed)",
    softGradient:
      "linear-gradient(135deg, rgba(99,102,241,0.18), rgba(139,92,246,0.10), rgba(124,58,237,0.14))",
    glow: "rgba(99,102,241,0.22)",
    border: "rgba(99,102,241,0.38)",
    text: "linear-gradient(180deg, #ffffff 0%, #cbd5e1 100%)",
    accent: "#6366f1",
  },

  social: {
    name: "Quantum Cyan",
    label: "AI Intelligence",
    description: "Deep oceanic azure and precision cyan engineered for generative intelligence interfaces.",
    gradient: "linear-gradient(135deg, #0ea5e9, #0284c7, #0369a1)",
    softGradient:
      "linear-gradient(135deg, rgba(14,165,233,0.18), rgba(2,132,199,0.10), rgba(3,105,161,0.14))",
    glow: "rgba(14,165,233,0.22)",
    border: "rgba(14,165,233,0.38)",
    text: "linear-gradient(180deg, #ffffff 0%, #bae6fd 100%)",
    accent: "#0ea5e9",
  },

  royal: {
    name: "Obsidian Titanium",
    label: "Monochrome Luxury",
    description: "Pure platinum and titanium luster for premium luxury brand collaborations.",
    gradient: "linear-gradient(135deg, #f8fafc, #cbd5e1, #94a3b8)",
    softGradient:
      "linear-gradient(135deg, rgba(248,250,252,0.15), rgba(203,213,225,0.08), rgba(148,163,184,0.12))",
    glow: "rgba(248,250,252,0.18)",
    border: "rgba(203,213,225,0.32)",
    text: "linear-gradient(180deg, #ffffff 0%, #cbd5e1 100%)",
    accent: "#f8fafc",
  },

  neon: {
    name: "Emerald Signal",
    label: "Verified Pipeline",
    description: "Precision tech green indicating verified workflows, commercial rights, and real-time execution.",
    gradient: "linear-gradient(135deg, #10b981, #059669, #047857)",
    softGradient:
      "linear-gradient(135deg, rgba(16,185,129,0.18), rgba(5,150,105,0.10), rgba(4,120,87,0.14))",
    glow: "rgba(16,185,129,0.22)",
    border: "rgba(16,185,129,0.38)",
    text: "linear-gradient(180deg, #ffffff 0%, #a7f3d0 100%)",
    accent: "#10b981",
  },
};

export function isThemeKey(value: string | null): value is ThemeKey {
  return value === "flame" || value === "social" || value === "royal" || value === "neon";
}

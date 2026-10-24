import type { SVGProps } from "react";

/**
 * Lightweight stroke icon set (24×24 grid) used across the KreaLink UI.
 * Kept in-repo so the design system has no extra runtime dependency.
 */
const PATHS = {
  sparkles: "M11 3l1.8 5.2L18 10l-5.2 1.8L11 17l-1.8-5.2L4 10l5.2-1.8z M19 3v4 M17 5h4 M18 16v3 M16.5 17.5h3",
  pencil: "M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17z M14 7l3 3",
  bookmark: "M6 3.5h12v17l-6-4-6 4z",
  bell: "M6 9a6 6 0 1 1 12 0c0 6.5 2.5 8.5 2.5 8.5h-17S6 15.5 6 9z M10.2 20.5a2 2 0 0 0 3.6 0",
  settings: "M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4z M19.4 13.5a7.6 7.6 0 0 0 0-3l2-1.6-2-3.4-2.4 1a7.6 7.6 0 0 0-2.6-1.5L14 2.5h-4l-.4 2.5A7.6 7.6 0 0 0 7 6.5l-2.4-1-2 3.4 2 1.6a7.6 7.6 0 0 0 0 3l-2 1.6 2 3.4 2.4-1a7.6 7.6 0 0 0 2.6 1.5l.4 2.5h4l.4-2.5a7.6 7.6 0 0 0 2.6-1.5l2.4 1 2-3.4z",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z M20 20l-3.6-3.6",
  chevronsLeft: "M11 17l-5-5 5-5 M18 17l-5-5 5-5",
  chevronRight: "M9 6l6 6-6 6",
  chevronLeft: "M15 6l-6 6 6 6",
  chevronDown: "M6 9l6 6 6-6",
  plus: "M12 5v14 M5 12h14",
  minus: "M5 12h14",
  chatPlus: "M20 15.5a2 2 0 0 1-2 2H8l-4 3.5V5.5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2z M12 7.5v6 M9 10.5h6",
  chat: "M20 15.5a2 2 0 0 1-2 2H8l-4 3.5V5.5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2z",
  chart: "M4 20h16 M7 16v-5 M12 16V6 M17 16v-8",
  users: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z M2.5 20a6.5 6.5 0 0 1 13 0 M16 4.3a3.5 3.5 0 0 1 0 6.6 M18 14.2a6.5 6.5 0 0 1 3.5 5.8",
  compare: "M8 4v16 M16 4v16 M4 8h4 M4 16h4 M16 8h4 M16 12h4 M16 16h4",
  briefcase: "M3.5 8h17v11.5h-17z M8.5 8V5.5h7V8 M3.5 13h17",
  star: "M12 3.2l2.7 5.5 6 .9-4.4 4.2 1 6-5.3-2.8-5.3 2.8 1-6-4.4-4.2 6-.9z",
  banknote: "M3 6.5h18v11H3z M12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z M6 9.5v.01 M18 14.5v.01",
  flag: "M5 21V4 M5 4.5h11.5l-2 4 2 4H5",
  globe: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M3 12h18 M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9s1.3-6.4 3.8-9z",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 7v5l3.2 2",
  film: "M3.5 4.5h17v15h-17z M7.5 4.5v15 M16.5 4.5v15 M3.5 9h4 M3.5 15h4 M16.5 9h4 M16.5 15h4",
  image: "M3.5 4.5h17v15h-17z M9 10.5a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6z M20.5 15l-5-5-11 9.5",
  upload: "M12 15.5V4 M7 9l5-5 5 5 M4 15v4.5h16V15",
  download: "M12 4v11.5 M7 10.5l5 5 5-5 M4 15v4.5h16V15",
  send: "M21 3L10.5 13.5 M21 3l-6.5 18-4-7.5L3 9.5z",
  shield: "M12 3l7.5 3v6c0 4.6-3.2 7.8-7.5 9-4.3-1.2-7.5-4.4-7.5-9V6z M8.8 12l2.2 2.2 4.2-4.4",
  scale: "M12 3.5v17 M6 20.5h12 M4.5 7h15 M6.5 7L3.5 13.5a3 3 0 0 0 6 0z M17.5 7l-3 6.5a3 3 0 0 0 6 0z",
  x: "M6 6l12 12 M18 6L6 18",
  check: "M5 12.5l4.5 4.5L19 7",
  checkCircle: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M8.2 12.2l2.6 2.6 5-5.2",
  xCircle: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M9 9l6 6 M15 9l-6 6",
  alert: "M12 3.5L2.5 20h19z M12 10v4.5 M12 17.2v.01",
  info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 11v5.5 M12 7.8v.01",
  layers: "M12 3.5l9 4.8-9 4.8-9-4.8z M3 12.5l9 4.8 9-4.8 M3 16.5l9 4.8 9-4.8",
  wand: "M4 20L15 9 M15 4v2 M15 12v2 M11 8h2 M17 8h2 M18.5 4.5l-1.4 1.4 M12.9 10.1l-1.4 1.4",
  bot: "M5 9h14v10.5H5z M12 9V5 M12 5a1.2 1.2 0 1 0 0-.01 M9 13.5v1 M15 13.5v1 M2.5 13v3 M21.5 13v3 M9.5 17h5",
  arrowRight: "M5 12h14 M13 6l6 6-6 6",
  arrowLeft: "M19 12H5 M11 6l-6 6 6 6",
  arrowUpRight: "M7 17L17 7 M8.5 7H17v8.5",
  history: "M3.5 12a8.5 8.5 0 1 0 2.6-6.1 M3.5 4.5v4h4 M12 8v4.2l3 1.8",
  filter: "M3.5 5h17l-6.5 7.5v6l-4 2v-8z",
  eye: "M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  play: "M7.5 4.5l12 7.5-12 7.5z",
  refresh: "M20.5 12a8.5 8.5 0 1 1-2.5-6 M20.5 3.5v5h-5",
  mapPin: "M12 21s-6.5-6-6.5-11.5a6.5 6.5 0 0 1 13 0C18.5 15 12 21 12 21z M12 12a2.4 2.4 0 1 0 0-4.8 2.4 2.4 0 0 0 0 4.8z",
  calendar: "M3.5 5.5h17v15h-17z M8 3v4.5 M16 3v4.5 M3.5 10h17",
  menu: "M4 6.5h16 M4 12h16 M4 17.5h16",
  logout: "M14.5 4H19.5v16h-5 M10 16.5L5.5 12 10 7.5 M5.5 12h10",
  home: "M3.5 11L12 3.5 20.5 11 M5.5 9.5v11h13v-11",
  compass: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M15.8 8.2l-2.3 5.3-5.3 2.3 2.3-5.3z",
  folder: "M3.5 6h6l2 2.5h9v11h-17z",
  inbox: "M3.5 13.5h5l1.5 3h4l1.5-3h5 M6 5h12l2.5 8.5v6h-17v-6z",
  sliders: "M4 6.5h9 M17 6.5h3 M4 12h3 M11 12h9 M4 17.5h11 M19 17.5h1 M15 8.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4z M9 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z M17 19.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  dots: "M5.5 12h.01 M12 12h.01 M18.5 12h.01",
  grid: "M4 4h7v7H4z M13 4h7v7h-7z M4 13h7v7H4z M13 13h7v7h-7z",
  zap: "M13 2.5L4.5 13.5H11l-1 8 8.5-11H12z",
  target: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9z M12 12.6a.6.6 0 1 0 0-1.2.6.6 0 0 0 0 1.2z",
  link: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1 M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1",
  file: "M14 3.5H6.5v17h11V7z M14 3.5V7h3.5",
  fileCheck: "M14 3.5H6.5v17h11V7z M14 3.5V7h3.5 M9 14l2 2 4-4",
  diff: "M6 3.5v11 M6 20.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z M18 20.5v-11 M18 8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z M14 6h-3 M10 18h-1",
  lock: "M5.5 11h13v9.5h-13z M8 11V7.5a4 4 0 0 1 8 0V11",
  trophy: "M8 20.5h8 M12 16.5v4 M7 4h10v5a5 5 0 0 1-10 0z M17 5.5h3v1.8a3.2 3.2 0 0 1-3 3.2 M7 5.5H4v1.8a3.2 3.2 0 0 0 3 3.2",
  heart: "M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z",
  trash: "M4.5 7h15 M9.5 7V4.5h5V7 M6.5 7l1 13.5h9l1-13.5",
  external: "M14 4h6v6 M20 4l-9 9 M18 14v6H4V6h6",
  user: "M12 11.5a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4.5 20.5a7.5 7.5 0 0 1 15 0",
  palette: "M12 3.5a8.5 8.5 0 1 0 0 17c1.1 0 1.6-.7 1.6-1.5 0-1.1-.9-1.4-.9-2.4 0-.9.8-1.6 1.7-1.6h2.1a3.9 3.9 0 0 0 4-3.9c0-4.3-3.8-7.6-8.5-7.6z M7.5 12h.01 M9.5 8h.01 M14.5 8h.01",
  rocket: "M12 15l-3-3c1-4.5 4-8 9.5-8.5C18 9 14.5 12 12 15z M9 12l-3.5.5L4 15l4 1 M12 15l-.5 3.5L9 20l-1-4 M14.5 9.5h.01",
  cpu: "M7 7h10v10H7z M10 10h4v4h-4z M10 3.5V7 M14 3.5V7 M10 17v3.5 M14 17v3.5 M3.5 10H7 M3.5 14H7 M17 10h3.5 M17 14h3.5",
  hourglass: "M6.5 3.5h11 M6.5 20.5h11 M7.5 3.5c0 5 9 6 9 8.5s-9 3.5-9 8.5 M16.5 3.5c0 5-9 6-9 8.5s9 3.5 9 8.5",
  quote: "M9.5 7.5H5.5v5h4v1c0 1.7-1.3 3-3 3 M18.5 7.5h-4v5h4v1c0 1.7-1.3 3-3 3",
  thumbsUp: "M7 10.5v10H4v-10z M7 10.5l4-7c1.4 0 2.5 1.1 2.5 2.5v3h5.2a2 2 0 0 1 2 2.3l-1.2 7a2 2 0 0 1-2 1.7H7",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({
  name,
  size = 16,
  strokeWidth = 1.8,
  className,
  ...rest
}: { name: IconName; size?: number; strokeWidth?: number } & Omit<SVGProps<SVGSVGElement>, "name">) {
  const d = PATHS[name];
  const isDots = name === "dots";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={isDots ? 3 : strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...rest}
    >
      {d.split(" M").map((seg, i) => (
        <path key={i} d={i === 0 ? seg : `M${seg}`} />
      ))}
    </svg>
  );
}

/** Filled verified seal (green) used next to verified creator names. */
export function VerifiedSeal({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-label="Verified">
      <path
        fill="#4cae73"
        d="M12 1.8l2.6 1.9 3.2-.2 1 3.1 2.6 1.9-1 3.1 1 3.1-2.6 1.9-1 3.1-3.2-.2L12 22.2l-2.6-1.9-3.2.2-1-3.1-2.6-1.9 1-3.1-1-3.1 2.6-1.9 1-3.1 3.2.2z"
      />
      <path d="M8.3 12.2l2.5 2.5 4.9-5" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** KreaLink app mark — white tile with a forest "K" link glyph (mirrors the reference's logo tile). */
export function KreaMark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-label="KreaLink">
      <rect x="0.5" y="0.5" width="31" height="31" rx="8" fill="#f4f5f4" />
      <rect x="8" y="7.5" width="5" height="17" rx="1.6" fill="#0f2924" />
      <path d="M15 16l6.5-8.5h4.2L19.4 16l6.3 8.5h-4.2z" fill="#0f2924" />
      <circle cx="16.2" cy="16" r="1.7" fill="#74d04a" />
    </svg>
  );
}

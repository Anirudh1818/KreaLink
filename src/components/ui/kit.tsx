"use client";

import Link from "next/link";
import {
  type ButtonHTMLAttributes,
  type ReactNode,
  useEffect,
} from "react";
import { Icon, type IconName } from "./icons";

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

/* ------------------------------------------------------------------ */
/* Buttons                                                             */
/* ------------------------------------------------------------------ */

type ButtonVariant = "lime" | "dark" | "light" | "ghost" | "glass" | "danger" | "forest";
type ButtonSize = "xs" | "sm" | "md" | "lg";

const BTN_VARIANT: Record<ButtonVariant, string> = {
  lime: "kl-btn-lime font-semibold",
  dark: "bg-strong text-white hover:bg-black shadow-[0_8px_20px_-12px_rgba(0,0,0,0.6)]",
  light: "bg-white text-strong shadow-[inset_0_0_0_1px_var(--color-line-2)] hover:bg-[#f6f7f6]",
  ghost: "text-body hover:bg-black/[0.04]",
  glass: "bg-white/10 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.16)] hover:bg-white/[0.16]",
  danger: "bg-white text-rose-600 shadow-[inset_0_0_0_1px_var(--color-rose-200)] hover:bg-rose-50",
  forest: "bg-forest-700 text-white hover:bg-forest-800 shadow-[0_8px_20px_-12px_rgba(16,45,39,0.8)]",
};

const BTN_SIZE: Record<ButtonSize, string> = {
  xs: "h-7 px-2.5 text-[11px] gap-1 rounded-full",
  sm: "h-8 px-3.5 text-xs gap-1.5 rounded-full",
  md: "h-10 px-5 text-[13px] gap-2 rounded-full",
  lg: "h-12 px-7 text-sm gap-2 rounded-full",
};

export type ButtonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  iconRight?: IconName;
  href?: string;
  className?: string;
  children?: ReactNode;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children">;

export function Button({
  variant = "light",
  size = "md",
  icon,
  iconRight,
  href,
  className,
  children,
  disabled,
  type = "button",
  ...rest
}: ButtonProps) {
  const iconSize = size === "lg" ? 17 : size === "md" ? 15 : 13;
  const classes = cn(
    "inline-flex shrink-0 items-center justify-center whitespace-nowrap font-medium transition active:scale-[0.98]",
    BTN_VARIANT[variant],
    BTN_SIZE[size],
    disabled && "pointer-events-none opacity-45",
    className
  );
  const content = (
    <>
      {icon && <Icon name={icon} size={iconSize} />}
      {children}
      {iconRight && <Icon name={iconRight} size={iconSize} />}
    </>
  );
  if (href && !disabled) {
    return (
      <Link href={href} className={classes}>
        {content}
      </Link>
    );
  }
  return (
    <button type={type} className={classes} disabled={disabled} {...rest}>
      {content}
    </button>
  );
}

export function IconButton({
  icon,
  tone = "light",
  size = 36,
  label,
  onClick,
  href,
  className,
  active,
  badge,
}: {
  icon: IconName;
  tone?: "light" | "glass" | "dark" | "plain";
  size?: number;
  label: string;
  onClick?: () => void;
  href?: string;
  className?: string;
  active?: boolean;
  badge?: number | boolean;
}) {
  const toneCls = {
    light: "bg-white text-body shadow-[inset_0_0_0_1px_var(--color-line-2)] hover:text-strong",
    glass: "bg-white/10 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18)] hover:bg-white/[0.18]",
    dark: "bg-[#1d1e1e] text-[#d6d8d7] shadow-[inset_0_0_0_1px_#333535] hover:text-white",
    plain: "text-muted hover:text-strong hover:bg-black/[0.04]",
  }[tone];
  const cls = cn(
    "relative inline-flex shrink-0 items-center justify-center rounded-full transition",
    toneCls,
    active && tone === "glass" && "bg-lime-400/25 text-lime-300",
    active && tone === "light" && "bg-mint-100 text-forest-700",
    className
  );
  const inner = (
    <>
      <Icon name={icon} size={Math.round(size * 0.44)} />
      {badge ? (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-lime-400 px-1 text-[9px] font-bold text-forest-950 ring-2 ring-ink">
          {typeof badge === "number" ? badge : ""}
        </span>
      ) : null}
    </>
  );
  if (href) {
    return (
      <Link href={href} aria-label={label} title={label} className={cls} style={{ width: size, height: size }}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} className={cls} style={{ width: size, height: size }}>
      {inner}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Pills, badges, chips                                                */
/* ------------------------------------------------------------------ */

export function Pill({ children, sub, icon, className }: { children: ReactNode; sub?: string; icon?: IconName; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg bg-[#f1f2f1] px-2.5 py-1 text-[12px] font-medium text-strong shadow-[inset_0_0_0_1px_var(--color-line)]",
        className
      )}
    >
      {icon && <Icon name={icon} size={12} className="text-muted" />}
      {children}
      {sub && <span className="text-[10px] font-normal text-muted">{sub}</span>}
    </span>
  );
}

type Tone = "green" | "red" | "amber" | "gray" | "lime" | "dark" | "blue";
const BADGE_TONE: Record<Tone, string> = {
  green: "bg-mint-100 text-forest-700 shadow-[inset_0_0_0_1px_rgba(54,126,99,0.18)]",
  red: "bg-rose-50 text-rose-600 shadow-[inset_0_0_0_1px_rgba(199,59,70,0.18)]",
  amber: "bg-amber-50 text-amber-600 shadow-[inset_0_0_0_1px_rgba(176,122,12,0.2)]",
  gray: "bg-[#f1f2f1] text-body shadow-[inset_0_0_0_1px_var(--color-line)]",
  lime: "bg-lime-400/20 text-lime-700 shadow-[inset_0_0_0_1px_rgba(93,181,54,0.3)]",
  dark: "bg-white/10 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.16)]",
  blue: "bg-[#eef3fb] text-[#2f5aa8] shadow-[inset_0_0_0_1px_rgba(47,90,168,0.16)]",
};

export function Badge({
  tone = "gray",
  icon,
  children,
  className,
  dot,
}: {
  tone?: Tone;
  icon?: IconName;
  children: ReactNode;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold", BADGE_TONE[tone], className)}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {icon && <Icon name={icon} size={11} strokeWidth={2.2} />}
      {children}
    </span>
  );
}

/** The bordered outline badge from the reference ("Top Rated Talent"). */
export function OutlineBadge({ icon = "trophy", children }: { icon?: IconName; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-mint-50 px-2.5 py-1 text-[12px] font-semibold text-forest-700 shadow-[inset_0_0_0_1.5px_#7fc7a2]">
      <Icon name={icon} size={13} />
      {children}
    </span>
  );
}

/** Dark sidebar chip ("Multiple Roles", "$90/hr"). */
export function RailChip({ icon, children }: { icon?: IconName; children: ReactNode }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1 truncate rounded-full bg-[#232424] px-2 py-0.5 text-[10.5px] text-[#b9bcbb] shadow-[inset_0_0_0_1px_#3a3c3c]">
      {icon && <Icon name={icon} size={11} />}
      <span className="truncate">{children}</span>
    </span>
  );
}

export function ChipToggle({
  options,
  value,
  onChange,
  className,
}: {
  options: readonly string[];
  value: string[];
  onChange: (next: string[]) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {options.map((opt) => {
        const on = value.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(on ? value.filter((v) => v !== opt) : [...value, opt])}
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-medium transition",
              on
                ? "bg-forest-700 text-white shadow-[0_6px_14px_-8px_rgba(16,45,39,0.9)]"
                : "bg-white text-body shadow-[inset_0_0_0_1px_var(--color-line-2)] hover:text-strong"
            )}
          >
            {on && <Icon name="check" size={12} strokeWidth={2.4} />}
            {opt}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Cards & layout                                                      */
/* ------------------------------------------------------------------ */

export function Card({
  children,
  className,
  soft,
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  soft?: boolean;
  padded?: boolean;
}) {
  return <section className={cn(soft ? "kl-card-soft" : "kl-card", padded && "p-5", className)}>{children}</section>;
}

export function CardTitle({
  title,
  subtitle,
  action,
  className,
  icon,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  className?: string;
  icon?: IconName;
}) {
  return (
    <div className={cn("mb-4 flex items-start justify-between gap-3", className)}>
      <div className="min-w-0">
        <h3 className="flex items-center gap-2 text-[16px] font-semibold text-strong">
          {icon && <Icon name={icon} size={17} className="text-forest-600" />}
          {title}
        </h3>
        {subtitle && <p className="mt-0.5 text-[12px] text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("text-[11.5px] font-medium text-muted", className)}>{children}</p>;
}

export function Divider({ className }: { className?: string }) {
  return <div className={cn("h-px w-full bg-line", className)} />;
}

export function KeyValue({ label, value, className }: { label: string; value: ReactNode; className?: string }) {
  return (
    <div className={cn("min-w-0", className)}>
      <SectionLabel>{label}</SectionLabel>
      <div className="mt-1 text-[13px] font-semibold text-strong">{value}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Avatar                                                              */
/* ------------------------------------------------------------------ */

const AVATAR_COLORS = ["#2a6352", "#3b5b8a", "#8a4b3b", "#6b4f8a", "#3b7a86", "#7a6b2a"];

export function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function Avatar({
  src,
  name,
  size = 40,
  online,
  ring,
  className,
}: {
  src?: string;
  name: string;
  size?: number;
  online?: boolean;
  ring?: boolean;
  className?: string;
}) {
  const color = AVATAR_COLORS[(name.charCodeAt(0) + name.length) % AVATAR_COLORS.length];
  return (
    <span className={cn("relative inline-flex shrink-0", className)} style={{ width: size, height: size }}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name}
          className={cn("h-full w-full rounded-full object-cover", ring && "ring-[3px] ring-white/80")}
        />
      ) : (
        <span
          className={cn("flex h-full w-full items-center justify-center rounded-full font-semibold text-white", ring && "ring-[3px] ring-white/80")}
          style={{ background: color, fontSize: Math.max(10, size * 0.36) }}
        >
          {initialsOf(name)}
        </span>
      )}
      {online && (
        <span
          className="absolute bottom-0 right-0 rounded-full bg-lime-500 ring-2 ring-white"
          style={{ width: Math.max(8, size * 0.2), height: Math.max(8, size * 0.2) }}
        />
      )}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Tabs                                                                */
/* ------------------------------------------------------------------ */

export type TabItem = { key: string; label: string; href?: string; count?: number };

/** Glass tab bar used at the bottom of the forest header (reference style). */
export function HeaderTabs({
  tabs,
  active,
  onChange,
  right,
}: {
  tabs: TabItem[];
  active: string;
  onChange?: (key: string) => void;
  right?: ReactNode;
}) {
  return (
    <div className="kl-glass-tabs flex items-center justify-between gap-2 px-2">
      <div className="flex min-w-0 items-center gap-1 overflow-x-auto">
        {tabs.map((t) => {
          const isActive = t.key === active;
          const cls = cn(
            "relative shrink-0 px-3.5 py-3 text-[13px] font-medium transition",
            isActive ? "text-white" : "text-white/65 hover:text-white"
          );
          const inner = (
            <>
              {t.label}
              {typeof t.count === "number" && (
                <span className={cn("ml-1.5 rounded-full px-1.5 py-px text-[10px] font-semibold", isActive ? "bg-lime-400 text-forest-950" : "bg-white/12 text-white/80")}>
                  {t.count}
                </span>
              )}
              {isActive && <span className="absolute inset-x-3 -bottom-px h-[2.5px] rounded-full bg-lime-400" />}
            </>
          );
          return t.href ? (
            <Link key={t.key} href={t.href} className={cls}>
              {inner}
            </Link>
          ) : (
            <button key={t.key} type="button" className={cls} onClick={() => onChange?.(t.key)}>
              {inner}
            </button>
          );
        })}
      </div>
      {right && <div className="hidden shrink-0 items-center gap-2 pr-1 md:flex">{right}</div>}
    </div>
  );
}

/** Light segmented control ("Overall | Skill Set | Price | Availability"). */
export function Segmented({
  options,
  value,
  onChange,
  className,
}: {
  options: { key: string; label: string; count?: number }[];
  value: string;
  onChange: (key: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex items-stretch rounded-[14px] bg-[#eceeed] p-1 shadow-[inset_0_0_0_1px_var(--color-line)]", className)}>
      {options.map((o, i) => {
        const on = o.key === value;
        const prevOn = i > 0 && options[i - 1].key === value;
        return (
          <button
            key={o.key}
            type="button"
            onClick={() => onChange(o.key)}
            className={cn(
              "relative flex-1 rounded-[10px] px-3 py-2 text-[12.5px] font-medium transition",
              on ? "bg-white text-strong shadow-[0_1px_3px_rgba(0,0,0,0.08),inset_0_0_0_1px_var(--color-line)]" : "text-muted hover:text-strong"
            )}
          >
            {!on && !prevOn && i > 0 && <span className="absolute left-0 top-1/2 h-4 w-px -translate-y-1/2 bg-line-2" />}
            {o.label}
            {typeof o.count === "number" && <span className="ml-1 text-[11px] text-faint">{o.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Scores                                                              */
/* ------------------------------------------------------------------ */

export function scoreTone(score: number): "green" | "amber" | "red" {
  if (score >= 75) return "green";
  if (score >= 55) return "amber";
  return "red";
}

export function ScoreRing({
  score,
  size = 18,
  stroke = 2.6,
  dark,
  className,
}: {
  score: number;
  size?: number;
  stroke?: number;
  dark?: boolean;
  className?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const tone = scoreTone(score);
  const color = dark
    ? tone === "green" ? "#8be35f" : tone === "amber" ? "#f2c45a" : "#ff8a92"
    : tone === "green" ? "#2f8a5f" : tone === "amber" ? "#c98d12" : "#d6454f";
  return (
    <svg width={size} height={size} className={cn("-rotate-90", className)} aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={dark ? "rgba(255,255,255,0.15)" : "#e3e7e5"} strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${(Math.max(0, Math.min(100, score)) / 100) * c} ${c}`}
      />
    </svg>
  );
}

export function ScoreBar({ value, tone, className }: { value: number; tone?: "green" | "amber" | "red" | "lime"; className?: string }) {
  const t = tone ?? scoreTone(value);
  const color = { green: "bg-forest-500", amber: "bg-amber-500", red: "bg-rose-500", lime: "bg-lime-500" }[t];
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-[#e6e9e7]", className)}>
      <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${Math.max(3, Math.min(100, value))}%` }} />
    </div>
  );
}

export function MatchChip({ score, className }: { score: number; className?: string }) {
  const tone = scoreTone(score);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11.5px] font-semibold",
        tone === "green" && "bg-mint-100 text-forest-700",
        tone === "amber" && "bg-amber-50 text-amber-600",
        tone === "red" && "bg-rose-50 text-rose-600",
        className
      )}
    >
      <ScoreRing score={score} size={12} stroke={2.2} />
      {score}% match
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Metric card (reference "Skills 3 of 4 Matched")                     */
/* ------------------------------------------------------------------ */

export function MetricCard({
  tone = "green",
  icon,
  label,
  value,
  of,
  caption,
  className,
}: {
  tone?: "green" | "red" | "amber";
  icon: IconName;
  label: string;
  value: ReactNode;
  of?: ReactNode;
  caption: ReactNode;
  className?: string;
}) {
  const toneCls = tone === "red" ? "kl-metric kl-metric-red" : tone === "amber" ? "kl-metric kl-metric-amber" : "kl-metric";
  const labelColor = tone === "red" ? "text-rose-600" : tone === "amber" ? "text-amber-600" : "text-forest-600";
  const valueColor = tone === "red" ? "text-rose-600" : "text-strong";
  return (
    <div className={cn(toneCls, "flex min-h-[148px] flex-col justify-between", className)}>
      <div className={cn("kl-metric-tab self-start", labelColor)}>
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-white shadow-[inset_0_0_0_1px_var(--color-line-2)]">
          <Icon name={icon} size={13} />
        </span>
        {label}
      </div>
      <div className="px-3 pb-3">
        <div className={cn("flex items-baseline gap-1 text-[19px] font-semibold leading-tight", valueColor)}>
          {value}
          {of && <span className="text-[11px] font-normal text-faint">{of}</span>}
        </div>
        <div className="mt-1 text-[11px] text-muted">{caption}</div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Pipeline stepper                                                    */
/* ------------------------------------------------------------------ */

export function Stepper({
  steps,
  current,
  dark,
  className,
}: {
  steps: { label: string; hint?: string }[];
  current: number;
  dark?: boolean;
  className?: string;
}) {
  return (
    <ol className={cn("flex w-full items-start", className)}>
      {steps.map((s, i) => {
        const done = i < current;
        const on = i === current;
        return (
          <li key={s.label} className="relative flex flex-1 flex-col items-center text-center">
            {i > 0 && (
              <span
                className={cn(
                  "absolute right-1/2 top-[11px] h-[2px] w-full",
                  done || on ? (dark ? "bg-lime-400/70" : "bg-forest-500") : dark ? "bg-white/15" : "bg-line-2"
                )}
              />
            )}
            <span
              className={cn(
                "relative z-[1] flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold",
                done && (dark ? "bg-lime-400 text-forest-950" : "bg-forest-600 text-white"),
                on && (dark ? "bg-white text-forest-900 ring-4 ring-lime-400/30" : "bg-lime-400 text-forest-950 ring-4 ring-lime-400/25"),
                !done && !on && (dark ? "bg-white/10 text-white/60 ring-1 ring-white/20" : "bg-white text-faint ring-1 ring-line-2")
              )}
            >
              {done ? <Icon name="check" size={12} strokeWidth={2.6} /> : i + 1}
            </span>
            <span className={cn("mt-1.5 text-[11.5px] font-semibold", dark ? (on || done ? "text-white" : "text-white/55") : on || done ? "text-strong" : "text-faint")}>
              {s.label}
            </span>
            {s.hint && <span className={cn("mt-0.5 hidden text-[10.5px] sm:block", dark ? "text-white/55" : "text-muted")}>{s.hint}</span>}
          </li>
        );
      })}
    </ol>
  );
}

/* ------------------------------------------------------------------ */
/* Notices, empty states, skeletons                                    */
/* ------------------------------------------------------------------ */

export function Notice({
  tone = "info",
  title,
  children,
  action,
  className,
  icon,
}: {
  tone?: "info" | "success" | "warn" | "danger" | "agent";
  title?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
  icon?: IconName;
}) {
  const map = {
    info: { cls: "bg-[#f3f6f5] shadow-[inset_0_0_0_1px_var(--color-line)] text-body", icon: "info" as IconName, ic: "text-forest-600" },
    success: { cls: "bg-mint-50 shadow-[inset_0_0_0_1px_rgba(54,126,99,0.2)] text-forest-800", icon: "checkCircle" as IconName, ic: "text-forest-600" },
    warn: { cls: "bg-amber-50 shadow-[inset_0_0_0_1px_rgba(176,122,12,0.22)] text-[#6b4b07]", icon: "alert" as IconName, ic: "text-amber-600" },
    danger: { cls: "bg-rose-50 shadow-[inset_0_0_0_1px_rgba(199,59,70,0.22)] text-[#7d1f27]", icon: "xCircle" as IconName, ic: "text-rose-600" },
    agent: { cls: "bg-forest-900 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]", icon: "sparkles" as IconName, ic: "text-lime-400" },
  }[tone];
  return (
    <div className={cn("flex items-start gap-3 rounded-2xl px-4 py-3", map.cls, className)}>
      <Icon name={icon ?? map.icon} size={17} className={cn("mt-0.5 shrink-0", map.ic)} />
      <div className="min-w-0 flex-1 text-[12.5px] leading-relaxed">
        {title && <p className={cn("font-semibold", tone === "agent" ? "text-white" : "text-strong")}>{title}</p>}
        {children && <div className={cn(title ? "mt-0.5" : undefined, tone === "agent" ? "text-white/75" : "")}>{children}</div>}
      </div>
      {action && <div className="shrink-0 self-center">{action}</div>}
    </div>
  );
}

export function EmptyState({
  icon = "sparkles",
  title,
  children,
  action,
  className,
}: {
  icon?: IconName;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-[20px] bg-white/60 px-6 py-12 text-center shadow-[inset_0_0_0_1px_var(--color-line)]", className)}>
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-mint-100 text-forest-600">
        <Icon name={icon} size={22} />
      </span>
      <h3 className="mt-4 text-[15px] font-semibold">{title}</h3>
      {children && <p className="mt-1 max-w-md text-[12.5px] leading-relaxed text-muted">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("kl-skeleton", className)} />;
}

/* ------------------------------------------------------------------ */
/* Form fields                                                         */
/* ------------------------------------------------------------------ */

export function Field({
  label,
  hint,
  children,
  className,
  required,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
  required?: boolean;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 flex items-center justify-between text-[12px] font-semibold text-strong">
        <span>
          {label}
          {required && <span className="ml-0.5 text-rose-500">*</span>}
        </span>
        {hint && <span className="text-[11px] font-normal text-muted">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

/* ------------------------------------------------------------------ */
/* Modal                                                               */
/* ------------------------------------------------------------------ */

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = 560,
  icon,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
  icon?: IconName;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/55 p-0 backdrop-blur-[3px] sm:items-center sm:p-6" onMouseDown={onClose}>
      <div
        className="animate-pop flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-[26px] bg-panel shadow-2xl sm:rounded-[26px]"
        style={{ maxWidth: width }}
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="kl-header m-2 mb-0 flex items-start justify-between gap-4 rounded-[20px] px-5 py-4">
          <div className="flex min-w-0 items-start gap-3">
            {icon && (
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-lime-300 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14)]">
                <Icon name={icon} size={17} />
              </span>
            )}
            <div className="min-w-0">
              <h2 className="text-[16px] font-semibold">{title}</h2>
              {subtitle && <p className="mt-0.5 text-[12px] text-white/65">{subtitle}</p>}
            </div>
          </div>
          <IconButton icon="x" tone="glass" size={30} label="Close" onClick={onClose} />
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-white/60 px-5 py-3.5">{footer}</div>}
      </div>
    </div>
  );
}

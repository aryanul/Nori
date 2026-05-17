"use client";

import { useTheme } from "@/hooks/use-theme";

const LABELS = {
  system: "System",
  light: "Light",
  dark: "Dark",
} as const;

export function ThemeToggle({ compact = true }: { compact?: boolean }) {
  const { preference, cycle } = useTheme();

  const Icon =
    preference === "system" ? SystemIcon : preference === "light" ? SunIcon : MoonIcon;

  return (
    <button
      type="button"
      onClick={cycle}
      title={`Theme: ${LABELS[preference]} (click to cycle)`}
      className={
        compact
          ? "flex size-7 items-center justify-center rounded-md text-[var(--ink-3)] transition-colors hover:bg-[var(--pane-2)] hover:text-[var(--ink-1)]"
          : "flex items-center gap-2 rounded-lg px-2 py-1 text-xs text-[var(--ink-2)] transition-colors hover:bg-[var(--pane-2)] hover:text-[var(--ink-1)]"
      }
    >
      <Icon />
      {!compact && <span>{LABELS[preference]}</span>}
    </button>
  );
}

function SystemIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <line x1="8" y1="20" x2="16" y2="20" />
      <line x1="12" y1="16" x2="12" y2="20" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z" />
    </svg>
  );
}

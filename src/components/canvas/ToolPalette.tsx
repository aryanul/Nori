"use client";

import { useCanvasStore, type Tool } from "@/store/canvas-store";
import { cn } from "@/lib/cn";

const TOOLS: Array<{
  id: Tool;
  label: string;
  shortcut: string;
  icon: React.ReactNode;
}> = [
  {
    id: "select",
    label: "Select",
    shortcut: "V",
    icon: (
      <svg
        viewBox="0 0 24 24"
        width="14"
        height="14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M5 3l5 14 2-6 6-2-13-6z" />
      </svg>
    ),
  },
  {
    id: "card",
    label: "Card",
    shortcut: "C",
    icon: (
      <svg
        viewBox="0 0 24 24"
        width="14"
        height="14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="4" y="6" width="16" height="12" rx="2" />
        <line x1="7" y1="10" x2="14" y2="10" />
        <line x1="7" y1="13" x2="12" y2="13" />
      </svg>
    ),
  },
  {
    id: "sticky",
    label: "Sticky",
    shortcut: "S",
    icon: (
      <svg
        viewBox="0 0 24 24"
        width="14"
        height="14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M5 4h11l4 4v12H5z" />
        <path d="M16 4v4h4" />
      </svg>
    ),
  },
  {
    id: "frame",
    label: "Frame",
    shortcut: "F",
    icon: (
      <svg
        viewBox="0 0 24 24"
        width="14"
        height="14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="3 3"
      >
        <rect x="4" y="5" width="16" height="14" rx="2" />
      </svg>
    ),
  },
  {
    id: "image",
    label: "Image",
    shortcut: "I",
    icon: (
      <svg
        viewBox="0 0 24 24"
        width="14"
        height="14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="9" cy="9" r="2" />
        <path d="M21 15l-5-5L5 21" />
      </svg>
    ),
  },
  {
    id: "link",
    label: "Link",
    shortcut: "L",
    icon: (
      <svg
        viewBox="0 0 24 24"
        width="14"
        height="14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 1 0-7-7l-1 1" />
        <path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 1 0 7 7l1-1" />
      </svg>
    ),
  },
  {
    id: "draw",
    label: "Draw",
    shortcut: "D",
    icon: (
      <svg
        viewBox="0 0 24 24"
        width="14"
        height="14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 19l7-7a2.83 2.83 0 0 0-4-4l-7 7v4z" />
        <path d="M14 6l4 4" />
      </svg>
    ),
  },
];

export function ToolPalette() {
  const activeTool = useCanvasStore((s) => s.activeTool);
  const setActiveTool = useCanvasStore((s) => s.setActiveTool);

  return (
    <div className="pointer-events-auto flex items-center gap-1 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-90)] p-1.5 backdrop-blur-xl shadow-[0_18px_50px_-15px_rgba(0,0,0,0.45)]">
      {TOOLS.map((t) => {
        const active = activeTool === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTool(t.id)}
            title={`${t.label} (${t.shortcut})`}
            aria-label={t.label}
            className={cn(
              "group relative flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-[11px] uppercase tracking-[0.14em] transition-colors",
              // Touch-friendly: bump min hit area on coarse pointers.
              "pointer-coarse:min-h-[44px] pointer-coarse:min-w-[44px] pointer-coarse:justify-center",
              active
                ? "bg-sky-100 text-sky-900 shadow-[inset_0_0_0_1px_rgb(125,211,252)] dark:bg-[#7ad7ff]/[0.14] dark:text-[var(--ink-1)] dark:shadow-[inset_0_0_0_1px_rgba(122,215,255,0.35)]"
                : "text-[var(--ink-3)] hover:bg-[var(--pane-2)] hover:text-[var(--ink-1)]",
            )}
          >
            {t.icon}
            {/* Label hidden on narrow viewports / coarse pointers to keep
                the palette one-row and tappable. */}
            <span className="hidden sm:inline pointer-coarse:sm:hidden">{t.label}</span>
            <span
              className={cn(
                "ml-1 hidden rounded-[5px] border border-[var(--border-faint)] px-1 py-[1px] font-mono text-[9px] leading-none sm:inline pointer-coarse:sm:hidden",
                active ? "border-[#7ad7ff]/30 text-[var(--ink-2)]" : "text-[var(--ink-4)]",
              )}
            >
              {t.shortcut}
            </span>
          </button>
        );
      })}
    </div>
  );
}

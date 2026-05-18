"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useOsModifier } from "@/hooks/use-os-modifier";
import { cn } from "@/lib/cn";

// v2 = per-workspace key. v1 was a single global flag (`nori:onboarded:v1`)
// and is checked once on mount to migrate existing users without re-flashing
// the generic tutorial.
const GLOBAL_LEGACY_KEY = "nori:onboarded:v1";
const storageKeyFor = (workspaceId: string) =>
  `nori:onboarded:v2:${workspaceId}`;

type Slide = {
  title: string;
  body: string;
  illustration: React.ReactNode;
  kbd?: string[];
};

type Props = {
  workspaceId: string;
  templateId?: string | null;
};

function genericSlides(mod: string): Slide[] {
  return [
    {
      title: "Welcome to the canvas",
      body: "Nori is an infinite, spatial workspace. Drag to pan, scroll to zoom — there are no borders.",
      illustration: (
        <svg viewBox="0 0 200 100" className="h-20 w-full">
          <pattern
            id="t-grid"
            width="12"
            height="12"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="1" cy="1" r="0.8" fill="rgba(255,255,255,0.18)" />
          </pattern>
          <rect width="200" height="100" fill="url(#t-grid)" />
          <rect
            x="40"
            y="25"
            width="50"
            height="30"
            rx="6"
            fill="#0c0d12"
            stroke="rgba(255,255,255,0.15)"
          />
          <rect
            x="110"
            y="50"
            width="55"
            height="32"
            rx="6"
            fill="#0c0d12"
            stroke="rgba(122,215,255,0.6)"
          />
          <path
            d="M 90 40 C 110 40, 105 65, 110 65"
            stroke="rgba(255,255,255,0.7)"
            strokeWidth="1.2"
            fill="none"
          />
        </svg>
      ),
    },
    {
      title: "Create things fast",
      body: "Double-click empty space to drop a card. Press V/C/S/F/I/L/D to switch tools, or paste an image or URL straight onto the canvas.",
      illustration: (
        <div className="flex items-center justify-center gap-1.5 py-4">
          {["V", "C", "S", "F", "I", "L", "D"].map((k) => (
            <kbd
              key={k}
              className="rounded-md border border-[var(--border-default)] bg-[var(--pane-2)] px-2 py-1.5 font-mono text-xs text-[var(--ink-1)]"
            >
              {k}
            </kbd>
          ))}
        </div>
      ),
    },
    {
      title: "Work together, live",
      body: "Share the workspace URL to invite collaborators. Every move, edit, and cursor appears for everyone in real time.",
      illustration: (
        <div className="flex items-center justify-center gap-1.5 py-4">
          {[
            { c: "#7ad7ff", l: "A" },
            { c: "#e98dd8", l: "B" },
            { c: "#f5cd7a", l: "C" },
          ].map((u, i) => (
            <div
              key={i}
              className="flex size-9 items-center justify-center rounded-full text-xs font-semibold text-white/95 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18),0_0_0_3px_#0a0b10]"
              style={{
                backgroundColor: u.c,
                transform: `translateX(${i * -8}px)`,
              }}
            >
              {u.l}
            </div>
          ))}
        </div>
      ),
    },
    {
      title: "Master it",
      body: "Open the command palette with ⌘K (or Ctrl K) for fast access to every action. Press ? any time to see all shortcuts.",
      kbd: [mod, "K"],
      illustration: (
        <div className="flex items-center justify-center gap-1.5 py-4">
          <kbd className="rounded-md border border-[var(--border-default)] bg-[var(--pane-2)] px-2.5 py-1.5 font-mono text-xs text-[var(--ink-1)]">
            {mod}
          </kbd>
          <kbd className="rounded-md border border-[var(--border-default)] bg-[var(--pane-2)] px-2.5 py-1.5 font-mono text-xs text-[var(--ink-1)]">
            K
          </kbd>
          <span className="px-1 text-[var(--ink-4)]">·</span>
          <kbd className="rounded-md border border-[var(--border-default)] bg-[var(--pane-2)] px-2.5 py-1.5 font-mono text-xs text-[var(--ink-1)]">
            ?
          </kbd>
        </div>
      ),
    },
  ];
}

const TEMPLATE_SLIDES: Record<string, Slide> = {
  brainstorm: {
    title: "Group ideas with frames",
    body: "Press F to drop a frame, then drag it over a cluster of stickies. The frame picks up everything inside — move them all at once.",
    illustration: (
      <div className="flex items-center justify-center py-4">
        <div className="relative h-20 w-44 rounded-lg border border-dashed border-[var(--border-default)] bg-[var(--pane-1)]">
          <span className="absolute left-3 top-2 size-5 rounded-sm bg-amber-300/80 shadow-sm" />
          <span className="absolute left-12 top-7 size-5 rounded-sm bg-pink-300/80 shadow-sm" />
          <span className="absolute left-24 top-4 size-5 rounded-sm bg-sky-300/80 shadow-sm" />
        </div>
      </div>
    ),
  },
  roadmap: {
    title: "Connect cards into flows",
    body: "Hover the right edge of a card — a small dot appears. Drag it onto another card to draw a connection.",
    illustration: (
      <div className="flex items-center justify-center gap-2 py-4">
        <span className="size-8 rounded-md border border-[var(--border-default)] bg-[var(--pane-2)]" />
        <svg width="40" height="14" viewBox="0 0 40 14" fill="none">
          <path
            d="M 2 7 H 36"
            stroke="rgba(122,215,255,0.7)"
            strokeWidth="1.5"
          />
          <path
            d="M 30 2 L 38 7 L 30 12"
            stroke="rgba(122,215,255,0.7)"
            strokeWidth="1.5"
            fill="none"
          />
        </svg>
        <span className="size-8 rounded-md border border-[var(--border-default)] bg-[var(--pane-2)]" />
      </div>
    ),
  },
};

export function FirstRunTutorial({ workspaceId, templateId }: Props) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [skipGeneric, setSkipGeneric] = useState(false);
  const [idx, setIdx] = useState(0);
  const mod = useOsModifier();

  useEffect(() => {
    setMounted(true);
    if (typeof window === "undefined") return;
    try {
      // Per-workspace flag — if set, never show again here.
      if (window.localStorage.getItem(storageKeyFor(workspaceId))) return;
      // Migration: an existing user with the old global flag has already seen
      // the generic intro. Skip the generic slides but still show any
      // template-specific tip the new workspace might have.
      const wasOnboardedGlobally =
        !!window.localStorage.getItem(GLOBAL_LEGACY_KEY);
      setSkipGeneric(wasOnboardedGlobally);
      setOpen(true);
      setIdx(0);
    } catch {
      // localStorage disabled — don't show
    }
  }, [workspaceId]);

  const dismiss = () => {
    setOpen(false);
    try {
      window.localStorage.setItem(
        storageKeyFor(workspaceId),
        new Date().toISOString(),
      );
    } catch {
      // ignore
    }
  };

  if (!mounted) return null;

  const slides: Slide[] = [];
  if (!skipGeneric) slides.push(...genericSlides(mod.symbol));
  const templateSlide =
    templateId && templateId in TEMPLATE_SLIDES
      ? TEMPLATE_SLIDES[templateId]
      : null;
  if (templateSlide) slides.push(templateSlide);

  // Nothing to show (e.g. blank template + already-onboarded user).
  if (slides.length === 0) return null;

  const safeIdx = Math.min(idx, slides.length - 1);
  const slide = slides[safeIdx];
  const last = safeIdx === slides.length - 1;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="onboard-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="pointer-events-auto fixed inset-0 z-[130] flex items-center justify-center bg-black/65 backdrop-blur-md"
        >
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="relative w-full max-w-md overflow-hidden rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-97)] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.55)] backdrop-blur-xl"
          >
            <span className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[var(--highlight)] to-transparent" />

            <div className="border-b border-[var(--border-faint)] bg-gradient-to-b from-[var(--pane-1)] to-transparent px-6 pt-6 pb-3">
              <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--ink-4)]">
                {skipGeneric ? "Template tip" : "Welcome to Nori"}
              </p>
            </div>

            <div className="px-6 pb-2 pt-5">
              <div className="rounded-xl border border-[var(--border-faint)] bg-[var(--pane-1)]">
                {slide.illustration}
              </div>
              <h2 className="mt-5 text-xl font-medium tracking-tight text-[var(--ink-1)]">
                {slide.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--ink-2)]">
                {slide.body}
              </p>
            </div>

            <div className="flex items-center justify-between border-t border-[var(--border-faint)] px-6 py-3.5">
              <div className="flex items-center gap-1.5">
                {slides.map((_, i) => (
                  <span
                    key={i}
                    className={cn(
                      "h-1 rounded-full transition-all",
                      i === safeIdx
                        ? "w-5 bg-[var(--ink-1)]"
                        : "w-1.5 bg-[var(--ink-4)]",
                    )}
                  />
                ))}
              </div>
              <div className="flex items-center gap-1.5">
                {safeIdx > 0 && (
                  <button
                    type="button"
                    onClick={() => setIdx(safeIdx - 1)}
                    className="rounded-lg px-3 py-1.5 text-xs text-[var(--ink-3)] transition-colors hover:bg-[var(--pane-2)] hover:text-[var(--ink-1)]"
                  >
                    Back
                  </button>
                )}
                {last ? (
                  <button
                    type="button"
                    onClick={dismiss}
                    className="rounded-lg border border-sky-300 bg-sky-100 px-3.5 py-1.5 text-xs font-medium text-sky-900 transition-colors hover:bg-sky-200 hover:border-sky-400 dark:border-sky-400/40 dark:bg-sky-400/10 dark:text-sky-100 dark:hover:bg-sky-400/20"
                  >
                    Got it
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIdx(safeIdx + 1)}
                    className="rounded-lg border border-[var(--border-default)] bg-[var(--pane-2)] px-3.5 py-1.5 text-xs font-medium text-[var(--ink-1)] transition-colors hover:bg-[var(--pane-3)]"
                  >
                    Next
                  </button>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={dismiss}
              className="absolute right-3 top-3 flex size-7 items-center justify-center rounded-md text-[var(--ink-4)] transition-colors hover:bg-[var(--pane-2)] hover:text-[var(--ink-1)]"
              aria-label="Skip tutorial"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

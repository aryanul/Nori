"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useCanvasStore, type Tool } from "@/store/canvas-store";
import { useOsModifier } from "@/hooks/use-os-modifier";
import { cn } from "@/lib/cn";

type Action = {
  id: string;
  group: string;
  label: string;
  hint?: string;
  shortcut?: string[];
  run: () => void | Promise<void>;
};

type Props = {
  onUndo: () => void;
  onRedo: () => void;
};

function fuzzyMatch(query: string, label: string): number | null {
  if (!query) return 0;
  const q = query.toLowerCase();
  const l = label.toLowerCase();
  // Cheap subsequence match. Score = inverse of first-match index, so
  // labels starting with the query rank highest.
  let qi = 0;
  let firstMatch = -1;
  for (let i = 0; i < l.length && qi < q.length; i++) {
    if (l[i] === q[qi]) {
      if (firstMatch === -1) firstMatch = i;
      qi++;
    }
  }
  if (qi < q.length) return null;
  return firstMatch;
}

export function CommandPalette({ onUndo, onRedo }: Props) {
  const router = useRouter();
  const open = useCanvasStore((s) => s.commandPaletteOpen);
  const setOpen = useCanvasStore((s) => s.setCommandPaletteOpen);
  const setActiveTool = useCanvasStore((s) => s.setActiveTool);
  const resetViewport = useCanvasStore((s) => s.resetViewport);
  const selectAllNodes = useCanvasStore((s) => s.selectAllNodes);
  const clearSelection = useCanvasStore((s) => s.clearSelection);
  const toggleShortcuts = useCanvasStore((s) => s.toggleShortcuts);
  const readOnly = useCanvasStore((s) => s.readOnly);
  const mod = useOsModifier();
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setCursor(0);
      return;
    }
    // Focus next tick so the input is mounted.
    const t = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  const setTool = (t: Tool) => {
    setActiveTool(t);
    setOpen(false);
  };

  // Build the action list once per render. Editing actions are filtered
  // out when the workspace is read-only.
  const actions: Action[] = useMemo(() => {
    const toolActions: Action[] = [
      {
        id: "tool-select",
        group: "Tools",
        label: "Select tool",
        shortcut: ["V"],
        run: () => setTool("select"),
      },
      {
        id: "tool-card",
        group: "Tools",
        label: "Card tool",
        shortcut: ["C"],
        run: () => setTool("card"),
      },
      {
        id: "tool-sticky",
        group: "Tools",
        label: "Sticky tool",
        shortcut: ["S"],
        run: () => setTool("sticky"),
      },
      {
        id: "tool-frame",
        group: "Tools",
        label: "Frame tool",
        shortcut: ["F"],
        run: () => setTool("frame"),
      },
      {
        id: "tool-image",
        group: "Tools",
        label: "Image tool",
        shortcut: ["I"],
        run: () => setTool("image"),
      },
      {
        id: "tool-link",
        group: "Tools",
        label: "Link tool",
        shortcut: ["L"],
        run: () => setTool("link"),
      },
    ];

    const editActions: Action[] = readOnly
      ? []
      : [
          {
            id: "edit-undo",
            group: "Edit",
            label: "Undo",
            shortcut: [mod.symbol, "Z"],
            run: () => {
              onUndo();
              setOpen(false);
            },
          },
          {
            id: "edit-redo",
            group: "Edit",
            label: "Redo",
            shortcut: [mod.symbol, "⇧", "Z"],
            run: () => {
              onRedo();
              setOpen(false);
            },
          },
        ];

    const selectActions: Action[] = [
      {
        id: "select-all",
        group: "Selection",
        label: "Select all nodes",
        shortcut: [mod.symbol, "A"],
        run: () => {
          selectAllNodes();
          setOpen(false);
        },
      },
      {
        id: "select-clear",
        group: "Selection",
        label: "Clear selection",
        shortcut: ["Esc"],
        run: () => {
          clearSelection();
          setOpen(false);
        },
      },
    ];

    const viewActions: Action[] = [
      {
        id: "view-reset",
        group: "View",
        label: "Reset viewport (100%)",
        run: () => {
          resetViewport();
          setOpen(false);
        },
      },
      {
        id: "view-shortcuts",
        group: "View",
        label: "Show keyboard shortcuts",
        shortcut: ["?"],
        run: () => {
          setOpen(false);
          // Small delay so the palette closes before the shortcuts open;
          // looks cleaner than both transitioning at once.
          setTimeout(() => toggleShortcuts(), 60);
        },
      },
    ];

    const navActions: Action[] = [
      {
        id: "nav-home",
        group: "Navigation",
        label: "Go to home",
        run: () => {
          setOpen(false);
          router.push("/");
        },
      },
    ];

    return [
      ...toolActions,
      ...editActions,
      ...selectActions,
      ...viewActions,
      ...navActions,
    ];
    // setOpen / set* are stable refs from Zustand; safe to omit
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readOnly, mod.symbol, onUndo, onRedo]);

  const filtered = useMemo(() => {
    const matches = actions
      .map((a) => ({ action: a, score: fuzzyMatch(query, a.label) }))
      .filter(
        (x): x is { action: Action; score: number } => x.score !== null,
      )
      .sort((a, b) => a.score - b.score);
    return matches.map((m) => m.action);
  }, [actions, query]);

  // Reset cursor when results change.
  useEffect(() => setCursor(0), [filtered.length, query]);

  // Group filtered actions for display
  const grouped = useMemo(() => {
    const map = new Map<string, Action[]>();
    for (const a of filtered) {
      const g = map.get(a.group) ?? [];
      g.push(a);
      map.set(a.group, g);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const onInputKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      filtered[cursor]?.run();
    }
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="cmdk-backdrop"
          onPointerDown={() => setOpen(false)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.14 }}
          className="pointer-events-auto fixed inset-0 z-[125] flex items-start justify-center bg-black/55 pt-[18vh] backdrop-blur-md"
        >
          <motion.div
            onPointerDown={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-97)] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.55)] backdrop-blur-xl"
          >
            <span className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[var(--highlight)] to-transparent" />

            <div className="flex items-center gap-2.5 border-b border-[var(--border-faint)] px-4 py-3">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-[var(--ink-3)]"
              >
                <circle cx="11" cy="11" r="7" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onInputKey}
                placeholder="Type a command…"
                spellCheck={false}
                autoComplete="off"
                className="flex-1 cursor-text border-none bg-transparent text-sm text-[var(--ink-1)] outline-none placeholder:text-[var(--ink-4)]"
              />
              <kbd className="rounded-[5px] border border-[var(--border-soft)] bg-[var(--pane-2)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--ink-3)]">
                Esc
              </kbd>
            </div>

            <div className="max-h-[50vh] overflow-y-auto p-1.5">
              {filtered.length === 0 ? (
                <div className="px-3 py-6 text-center text-xs text-[var(--ink-4)]">
                  No matching commands.
                </div>
              ) : (
                grouped.map(([group, items]) => (
                  <div key={group} className="mb-2 last:mb-0">
                    <div className="px-2.5 pb-1 pt-1.5 text-[9px] font-medium uppercase tracking-[0.22em] text-[var(--ink-4)]">
                      {group}
                    </div>
                    {items.map((a) => {
                      const idx = filtered.indexOf(a);
                      const active = idx === cursor;
                      return (
                        <button
                          key={a.id}
                          type="button"
                          onPointerEnter={() => setCursor(idx)}
                          onClick={() => a.run()}
                          className={cn(
                            "flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors",
                            active
                              ? "bg-[var(--pane-2)] text-[var(--ink-1)]"
                              : "text-[var(--ink-2)] hover:bg-[var(--pane-1)]",
                          )}
                        >
                          <span className="truncate">{a.label}</span>
                          {a.shortcut && (
                            <span className="flex shrink-0 items-center gap-1">
                              {a.shortcut.map((k, i) => (
                                <kbd
                                  key={i}
                                  className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--pane-2)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--ink-3)]"
                                >
                                  {k}
                                </kbd>
                              ))}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-between border-t border-[var(--border-faint)] px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-[var(--ink-4)]">
              <span>
                <kbd className="mr-1 rounded-[4px] border border-[var(--border-soft)] bg-[var(--pane-2)] px-1 py-0.5 font-mono">↑↓</kbd>
                navigate
                <kbd className="mx-1 ml-3 rounded-[4px] border border-[var(--border-soft)] bg-[var(--pane-2)] px-1 py-0.5 font-mono">↵</kbd>
                run
              </span>
              <span>
                {mod.name} K
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

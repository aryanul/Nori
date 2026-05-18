"use client";

import { useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useCanvasStore } from "@/store/canvas-store";
import type { ActivityEvent, NodeKind } from "@/types/canvas";

function relTime(iso: string): string {
  const t = new Date(iso).getTime();
  const s = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function dayLabel(iso: string): string {
  const now = new Date();
  const d = new Date(iso);
  const todayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
  const yest = new Date(now);
  yest.setDate(yest.getDate() - 1);
  const yestKey = `${yest.getFullYear()}-${yest.getMonth()}-${yest.getDate()}`;
  const k = dayKey(iso);
  if (k === todayKey) return "Today";
  if (k === yestKey) return "Yesterday";
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

const KIND_NOUN: Record<NodeKind, string> = {
  card: "a card",
  sticky: "a sticky",
  frame: "a frame",
  image: "an image",
  link: "a link",
  drawing: "a drawing",
};

function describe(ev: ActivityEvent): { verb: string; target?: string } {
  const noun = ev.targetNodeKind ? KIND_NOUN[ev.targetNodeKind] : "a node";
  switch (ev.kind) {
    case "node_created":
      return { verb: `created ${noun}`, target: ev.targetLabel };
    case "node_deleted":
      return { verb: `deleted ${noun}`, target: ev.targetLabel };
    case "node_edited":
      return { verb: `edited ${noun}`, target: ev.targetLabel };
    case "thread_message_added":
      return { verb: "commented on", target: ev.targetLabel ?? noun };
    case "thread_resolved":
      return { verb: "resolved a thread on", target: ev.targetLabel ?? noun };
  }
}

export function ActivityPanel() {
  const open = useCanvasStore((s) => s.activityPanelOpen);
  const setOpen = useCanvasStore((s) => s.setActivityPanelOpen);
  const activities = useCanvasStore((s) => s.activities);

  const sorted = useMemo(() => {
    const list = Object.values(activities);
    list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return list;
  }, [activities]);

  const grouped = useMemo(() => {
    const groups: Array<{ key: string; label: string; items: ActivityEvent[] }> = [];
    for (const ev of sorted) {
      const k = dayKey(ev.createdAt);
      const last = groups[groups.length - 1];
      if (last && last.key === k) {
        last.items.push(ev);
      } else {
        groups.push({ key: k, label: dayLabel(ev.createdAt), items: [ev] });
      }
    }
    return groups;
  }, [sorted]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.aside
          key="activity-panel"
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 16 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="pointer-events-auto fixed right-4 top-20 bottom-20 z-[80] flex w-[320px] flex-col overflow-hidden rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-90)] backdrop-blur-xl shadow-[0_30px_80px_-20px_rgba(0,0,0,0.55)]"
        >
          <header className="flex items-center justify-between border-b border-[var(--border-faint)] px-4 py-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--ink-4)]">
                Activity
              </p>
              <p className="mt-0.5 text-[11px] text-[var(--ink-3)]">
                Last {sorted.length} {sorted.length === 1 ? "event" : "events"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close activity"
              className="flex size-7 items-center justify-center rounded-md text-[var(--ink-4)] transition-colors hover:bg-[var(--pane-2)] hover:text-[var(--ink-1)]"
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
          </header>

          <div className="flex-1 overflow-y-auto px-2 py-2">
            {sorted.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                <p className="text-xs text-[var(--ink-3)]">
                  No activity yet.
                </p>
                <p className="mt-1 text-[11px] text-[var(--ink-4)]">
                  Create, edit, or comment on a node to start the feed.
                </p>
              </div>
            ) : (
              grouped.map((g) => (
                <div key={g.key} className="mb-3">
                  <p className="px-2 pb-1 pt-2 text-[10px] uppercase tracking-[0.22em] text-[var(--ink-4)]">
                    {g.label}
                  </p>
                  <ul className="flex flex-col gap-0.5">
                    {g.items.map((ev) => {
                      const d = describe(ev);
                      return (
                        <li
                          key={ev.id}
                          className="flex gap-2.5 rounded-lg px-2 py-2 text-[11px] leading-relaxed text-[var(--ink-2)] transition-colors hover:bg-[var(--pane-2)]"
                        >
                          <span
                            aria-hidden
                            className="mt-1 size-2 shrink-0 rounded-full"
                            style={{ backgroundColor: ev.actorColor }}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate">
                              <span className="font-medium text-[var(--ink-1)]">
                                {ev.actorName || "Someone"}
                              </span>{" "}
                              {d.verb}
                              {d.target && (
                                <>
                                  {" "}
                                  <span className="text-[var(--ink-1)]">
                                    “{d.target}”
                                  </span>
                                </>
                              )}
                            </p>
                            <p className="text-[10px] text-[var(--ink-4)]">
                              {relTime(ev.createdAt)}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))
            )}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>,
    document.body,
  );
}

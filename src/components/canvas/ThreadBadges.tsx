"use client";

import { useMemo } from "react";
import { useCanvasStore } from "@/store/canvas-store";
import { cn } from "@/lib/cn";

/**
 * Renders comment badges for every threaded node. Lives as a sibling of
 * NodeCard inside the world-transform wrapper so the badges pan/zoom with
 * the canvas. Crucially, NOT inside the NodeCard's `overflow-hidden` —
 * which is why the previous in-card placement was getting clipped to a
 * dog-ear sliver.
 */
export function ThreadBadges() {
  const nodes = useCanvasStore((s) => s.nodes);
  const threads = useCanvasStore((s) => s.threads);
  const openThreadNodeId = useCanvasStore((s) => s.openThreadNodeId);
  const openThreadFor = useCanvasStore((s) => s.openThreadFor);

  // Pre-index threads by nodeId so the render is O(n) over nodes that have
  // a thread, not O(nodes × threads).
  const threadByNodeId = useMemo(() => {
    const map = new Map<string, (typeof threads)[string]>();
    for (const t of Object.values(threads)) map.set(t.nodeId, t);
    return map;
  }, [threads]);

  return (
    <>
      {Object.values(nodes).map((node) => {
        const thread = threadByNodeId.get(node.id);
        if (!thread) return null;
        const isOpen = openThreadNodeId === node.id;
        const count = thread.messages.length;
        const resolved = thread.resolved;

        return (
          <button
            key={thread.id}
            type="button"
            data-export-skip
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              openThreadFor(isOpen ? null : node.id);
            }}
            title={
              resolved
                ? "Resolved thread"
                : `${count} message${count === 1 ? "" : "s"}`
            }
            className={cn(
              "pointer-events-auto absolute z-10 flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium tabular-nums backdrop-blur-md transition-all",
              resolved
                ? "border-[var(--border-soft)] bg-[var(--surface-85)] text-[var(--ink-3)] hover:border-[var(--border-default)] hover:text-[var(--ink-2)]"
                : "border-amber-300 bg-amber-100 text-amber-900 hover:bg-amber-200 hover:border-amber-400 dark:border-amber-300/45 dark:bg-amber-300/[0.18] dark:text-amber-100 dark:hover:bg-amber-300/[0.28]",
              isOpen &&
                "shadow-[0_0_0_2px_rgba(245,205,122,0.35),0_8px_18px_-8px_rgba(0,0,0,0.6)]",
            )}
            style={{
              // Anchor to the node's top-right corner, slightly outside.
              left: node.x + node.width - 10,
              top: node.y - 12,
            }}
          >
            <svg
              width="9"
              height="9"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden
            >
              <path d="M4 3h16a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H8l-5 4V4a1 1 0 0 1 1-1z" />
            </svg>
            <span>{count}</span>
          </button>
        );
      })}
    </>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCanvasStore } from "@/store/canvas-store";
import { useOsModifier } from "@/hooks/use-os-modifier";
import type { CanvasNode, NodeThread } from "@/types/canvas";
import type { UserIdentity } from "@/types/realtime";
import { cn } from "@/lib/cn";

const PANEL_WIDTH = 280;
const PANEL_GAP = 16;

type Props = {
  self: UserIdentity | null;
};

function relTime(iso: string): string {
  const t = new Date(iso).getTime();
  const s = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (s < 5) return "now";
  if (s < 60) return `${s}s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function ThreadPanel({ self }: Props) {
  const openNodeId = useCanvasStore((s) => s.openThreadNodeId);
  const closeThread = useCanvasStore((s) => s.openThreadFor);
  const nodes = useCanvasStore((s) => s.nodes);
  const threads = useCanvasStore((s) => s.threads);
  const createThread = useCanvasStore((s) => s.createThread);
  const addMessageToThread = useCanvasStore((s) => s.addMessageToThread);
  const setThreadResolved = useCanvasStore((s) => s.setThreadResolved);
  const deleteThread = useCanvasStore((s) => s.deleteThread);
  const readOnly = useCanvasStore((s) => s.readOnly);
  const mod = useOsModifier();

  const [draft, setDraft] = useState("");
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const node: CanvasNode | undefined = openNodeId ? nodes[openNodeId] : undefined;
  const thread: NodeThread | undefined = openNodeId
    ? Object.values(threads).find((t) => t.nodeId === openNodeId)
    : undefined;

  // Focus composer + scroll to bottom on open / on new messages.
  useEffect(() => {
    if (!node) return;
    composerRef.current?.focus();
  }, [node?.id]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [thread?.messages.length]);

  // Reset draft when switching nodes.
  useEffect(() => {
    setDraft("");
  }, [openNodeId]);

  // Esc closes.
  useEffect(() => {
    if (!openNodeId) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "Escape") closeThread(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openNodeId, closeThread]);

  if (!node) return null;

  const send = () => {
    const body = draft.trim();
    if (!body || !self) return;
    const message = {
      authorId: self.id,
      authorName: self.name,
      authorColor: self.color,
      body,
    };
    if (thread) {
      addMessageToThread(thread.id, message);
    } else {
      createThread(node.id, message);
    }
    setDraft("");
  };

  const onComposerKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter = send, Shift+Enter = newline.
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        key={node.id}
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -8 }}
        transition={{ duration: 0.16, ease: "easeOut" }}
        onPointerDown={(e) => e.stopPropagation()}
        className="pointer-events-auto absolute z-[20] flex flex-col overflow-hidden rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-97)] shadow-[0_22px_60px_-20px_rgba(0,0,0,0.55)] backdrop-blur-xl"
        style={{
          left: node.x + node.width + PANEL_GAP,
          top: node.y,
          width: PANEL_WIDTH,
        }}
      >
        <span className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-[var(--highlight)] to-transparent" />

        <header className="flex items-center justify-between gap-2 border-b border-[var(--border-faint)] px-3 py-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-[0.22em] text-[var(--ink-3)]">
              {thread?.resolved ? "Resolved" : "Thread"}
            </span>
            {thread && thread.messages.length > 0 && (
              <span className="rounded-full bg-[var(--pane-2)] px-1.5 py-0.5 text-[10px] text-[var(--ink-3)]">
                {thread.messages.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {thread && !readOnly && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setThreadResolved(thread.id, !thread.resolved)
                  }
                  title={thread.resolved ? "Reopen" : "Mark resolved"}
                  className="rounded-md px-1.5 py-1 text-[10px] uppercase tracking-wider text-[var(--ink-3)] transition-colors hover:bg-[var(--pane-2)] hover:text-[var(--ink-1)]"
                >
                  {thread.resolved ? "Reopen" : "Resolve"}
                </button>
                <button
                  type="button"
                  onClick={() => deleteThread(thread.id)}
                  title="Delete thread"
                  className="rounded-md p-1 text-[var(--ink-4)] transition-colors hover:bg-red-400/10 hover:text-red-700 dark:hover:text-red-300"
                >
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  </svg>
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => closeThread(null)}
              className="rounded-md p-1 text-[var(--ink-4)] transition-colors hover:bg-[var(--pane-2)] hover:text-[var(--ink-1)]"
              aria-label="Close"
            >
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </header>

        <div
          ref={listRef}
          className="no-scrollbar flex max-h-[300px] flex-col gap-2.5 overflow-y-auto px-3 py-3"
        >
          {!thread || thread.messages.length === 0 ? (
            <p className="py-4 text-center text-[11px] text-[var(--ink-4)]">
              Start the conversation
            </p>
          ) : (
            thread.messages.map((m) => (
              <article
                key={m.id}
                className={cn(
                  "rounded-xl border border-[var(--border-faint)] bg-[var(--pane-1)] p-2.5",
                  m.authorId === self?.id && "border-[var(--border-soft)] bg-[var(--pane-2)]",
                )}
              >
                <header className="mb-1.5 flex items-center gap-1.5">
                  <span
                    className="flex size-4 items-center justify-center rounded-full text-[8px] font-semibold text-white"
                    style={{ backgroundColor: m.authorColor }}
                    title={m.authorName}
                  >
                    {(m.authorName || "?").trim().charAt(0).toUpperCase()}
                  </span>
                  <span className="truncate text-[11px] font-medium text-[var(--ink-1)]">
                    {m.authorName || "Guest"}
                  </span>
                  <span className="text-[10px] text-[var(--ink-4)]">
                    {relTime(m.createdAt)}
                  </span>
                </header>
                <p className="whitespace-pre-wrap text-xs leading-relaxed text-[var(--ink-2)]">
                  {m.body}
                </p>
              </article>
            ))
          )}
        </div>

        {readOnly ? (
          <div className="border-t border-[var(--border-faint)] px-3 py-2.5 text-[11px] text-[var(--ink-4)]">
            View-only — can’t reply
          </div>
        ) : (
          <div className="border-t border-[var(--border-faint)] p-2">
            <textarea
              ref={composerRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onComposerKey}
              placeholder="Reply…"
              rows={2}
              spellCheck={false}
              className="w-full resize-none cursor-text rounded-lg border border-[var(--border-faint)] bg-[var(--pane-1)] px-2.5 py-2 text-xs leading-relaxed text-[var(--ink-1)] outline-none transition-colors placeholder:text-[var(--ink-4)] focus:border-[var(--border-default)]"
            />
            <div className="mt-1.5 flex items-center justify-between">
              <span className="text-[9px] uppercase tracking-[0.18em] text-[var(--ink-4)]">
                <kbd className="mr-1 rounded-[3px] border border-[var(--border-soft)] bg-[var(--pane-2)] px-1 py-0.5 font-mono">↵</kbd>
                send
                <kbd className="ml-2 mr-1 rounded-[3px] border border-[var(--border-soft)] bg-[var(--pane-2)] px-1 py-0.5 font-mono">⇧↵</kbd>
                newline
              </span>
              <button
                type="button"
                onClick={send}
                disabled={!draft.trim() || !self}
                className="rounded-md border border-sky-300 bg-sky-100 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-sky-900 transition-colors hover:bg-sky-200 hover:border-sky-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-sky-400/35 dark:bg-sky-400/10 dark:text-sky-100 dark:hover:bg-sky-400/20"
              >
                Send
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

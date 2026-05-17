"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useCanvasStore } from "@/store/canvas-store";
import {
  expandFramesToContents,
  exportNodesAsPng,
  suggestFilename,
} from "@/lib/export-png";
import { Toast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";

type Props = {
  workspaceTitle: string;
  worldWrapperRef: React.RefObject<HTMLDivElement | null>;
};

export function ContextMenu({ workspaceTitle, worldWrapperRef }: Props) {
  const menu = useCanvasStore((s) => s.contextMenu);
  const close = useCanvasStore((s) => s.closeContextMenu);
  const readOnly = useCanvasStore((s) => s.readOnly);
  const [mounted, setMounted] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => setMounted(true), []);

  // Close on Escape
  useEffect(() => {
    if (!menu.visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menu.visible, close]);

  if (!mounted) return null;

  const runExport = async (variant: "selection" | "canvas") => {
    const wrapper = worldWrapperRef.current;
    if (!wrapper) {
      setToast("Couldn’t find canvas to export");
      return;
    }
    const state = useCanvasStore.getState();
    const allNodes = Object.values(state.nodes);
    let targetNodes: typeof allNodes;
    if (variant === "selection") {
      // Any frame in the selection pulls its visually-contained nodes along —
      // matches the frame's group-drag model.
      const expanded = expandFramesToContents(
        state.selectedNodeIds,
        state.nodes,
      );
      const expandedSet = new Set(expanded);
      targetNodes = allNodes.filter((n) => expandedSet.has(n.id));
    } else {
      targetNodes = allNodes;
    }
    if (targetNodes.length === 0) {
      setToast(
        variant === "selection"
          ? "Select something first"
          : "Nothing to export yet",
      );
      return;
    }
    close();
    setBusy(true);
    try {
      await exportNodesAsPng(wrapper, targetNodes, {
        filename: suggestFilename(
          workspaceTitle,
          variant === "selection" ? "selection" : undefined,
        ),
      });
      setToast(
        variant === "selection"
          ? `Exported ${targetNodes.length} node${
              targetNodes.length === 1 ? "" : "s"
            }`
          : "Workspace exported",
      );
    } catch (err) {
      console.error("[ContextMenu] export failed", err);
      setToast("Export failed — check console for details");
    } finally {
      setBusy(false);
    }
  };

  const deleteSelection = () => {
    if (readOnly) return;
    const state = useCanvasStore.getState();
    if (state.selectedNodeIds.length > 0) {
      state.removeNodes(state.selectedNodeIds);
    }
    close();
  };

  const addComment = () => {
    const state = useCanvasStore.getState();
    const target =
      state.selectedNodeIds[0] ?? Object.keys(state.nodes)[0] ?? null;
    if (!target) return;
    state.openThreadFor(target);
    close();
  };

  return createPortal(
    <>
      <AnimatePresence>
        {menu.visible && (
          <>
            {/* Invisible click-catcher closes the menu on outside click */}
            <div
              className="fixed inset-0 z-[105]"
              onPointerDown={close}
              onContextMenu={(e) => {
                e.preventDefault();
                close();
              }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: -2 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.12 }}
              style={{
                left: clampToViewport(menu.screenX, 220, "x"),
                top: clampToViewport(menu.screenY, 160, "y"),
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="fixed z-[110] w-56 overflow-hidden rounded-xl border border-[var(--border-soft)] bg-[var(--surface-97)] p-1 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.55)] backdrop-blur-xl"
            >
              {menu.variant === "selection" ? (
                <>
                  <MenuItem onClick={addComment}>
                    <CommentIcon />
                    {readOnly ? "Open comments" : "Add comment"}
                  </MenuItem>
                  <MenuItem onClick={() => runExport("selection")} disabled={busy}>
                    <DownloadIcon />
                    Export selection as PNG
                  </MenuItem>
                  {!readOnly && (
                    <MenuItem onClick={deleteSelection} tone="danger">
                      <TrashIcon />
                      Delete
                    </MenuItem>
                  )}
                </>
              ) : (
                <MenuItem onClick={() => runExport("canvas")} disabled={busy}>
                  <DownloadIcon />
                  Export workspace as PNG
                </MenuItem>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
      <Toast message={toast} onDone={() => setToast(null)} />
    </>,
    document.body,
  );
}

function clampToViewport(value: number, size: number, axis: "x" | "y"): number {
  if (typeof window === "undefined") return value;
  const max = axis === "x" ? window.innerWidth : window.innerHeight;
  return Math.min(value, max - size - 8);
}

function MenuItem({
  children,
  onClick,
  disabled,
  tone,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  tone?: "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors",
        disabled
          ? "cursor-not-allowed text-[var(--ink-4)]"
          : tone === "danger"
            ? "text-red-700 hover:bg-red-400/10 dark:text-red-200/90"
            : "text-[var(--ink-2)] hover:bg-[var(--pane-2)] hover:text-[var(--ink-1)]",
      )}
    >
      {children}
    </button>
  );
}

function DownloadIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

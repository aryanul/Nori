"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { deleteWorkspace } from "@/lib/actions/workspace";
import { Toast } from "@/components/ui/Toast";
import { useCanvasStore } from "@/store/canvas-store";
import { exportNodesAsPng, suggestFilename } from "@/lib/export-png";
import { cn } from "@/lib/cn";

type Props = {
  workspaceId: string;
  workspaceTitle: string;
  isOwner: boolean;
};

export function WorkspaceSettingsMenu({
  workspaceId,
  workspaceTitle,
  isOwner,
}: Props) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Close the popover menu on outside click / Esc.
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: PointerEvent) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node) &&
        !(e.target as HTMLElement).closest("[data-settings-popover]")
      ) {
        setMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const onCopyId = async () => {
    try {
      await navigator.clipboard.writeText(workspaceId);
      setToast("Workspace ID copied");
    } catch {
      setToast("Couldn’t copy ID");
    }
    setMenuOpen(false);
  };

  const onExport = async () => {
    setMenuOpen(false);
    const wrapper = document.querySelector<HTMLDivElement>(
      "[data-world-wrapper]",
    );
    if (!wrapper) {
      setToast("Canvas not ready");
      return;
    }
    const nodes = Object.values(useCanvasStore.getState().nodes);
    if (nodes.length === 0) {
      setToast("Nothing to export yet");
      return;
    }
    try {
      await exportNodesAsPng(wrapper, nodes, {
        filename: suggestFilename(workspaceTitle),
      });
      setToast("Workspace exported");
    } catch (err) {
      console.error("[WorkspaceSettings] export failed", err);
      setToast("Export failed");
    }
  };

  const onConfirmDelete = () => {
    startTransition(async () => {
      const res = await deleteWorkspace(workspaceId);
      if (res.ok) {
        setConfirmOpen(false);
        router.push("/");
      } else {
        setToast(res.error);
      }
    });
  };

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          setMenuOpen((o) => !o);
        }}
        title="Workspace settings"
        className="pointer-events-auto flex size-7 items-center justify-center rounded-lg border border-[var(--border-soft)] text-[var(--ink-3)] transition-colors hover:bg-[var(--pane-2)] hover:text-[var(--ink-1)]"
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            data-settings-popover
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.14, ease: "easeOut" }}
            className="pointer-events-auto absolute left-0 top-full mt-2 w-56 overflow-hidden rounded-xl border border-[var(--border-soft)] bg-[var(--surface-95)] p-1 backdrop-blur-xl shadow-[0_20px_50px_-15px_rgba(0,0,0,0.45)]"
          >
            <div className="border-b border-[var(--border-faint)] px-2.5 py-2">
              <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--ink-4)]">
                Workspace
              </p>
              <p className="mt-0.5 truncate text-xs font-medium text-[var(--ink-1)]">
                {workspaceTitle || "Untitled"}
              </p>
            </div>
            <MenuItem onClick={onExport}>
              <DownloadIcon />
              Export as PNG
            </MenuItem>
            <MenuItem onClick={onCopyId}>
              <CopyIcon />
              Copy workspace ID
            </MenuItem>
            {isOwner && (
              <MenuItem
                tone="danger"
                onClick={() => {
                  setConfirmOpen(true);
                  setMenuOpen(false);
                }}
              >
                <TrashIcon />
                Delete workspace…
              </MenuItem>
            )}
            {!isOwner && (
              <div className="px-2.5 py-2 text-[10px] text-[var(--ink-4)]">
                Only the owner can delete this workspace.
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete confirmation — portal so it overlays everything */}
      {mounted &&
        createPortal(
          <AnimatePresence>
            {confirmOpen && (
              <motion.div
                key="del-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.16 }}
                onPointerDown={() => setConfirmOpen(false)}
                className="pointer-events-auto fixed inset-0 z-[115] flex items-center justify-center bg-black/60 backdrop-blur-md"
              >
                <motion.div
                  onPointerDown={(e) => e.stopPropagation()}
                  initial={{ opacity: 0, y: 12, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.98 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="w-full max-w-sm overflow-hidden rounded-2xl border border-red-400/30 bg-[var(--surface-95)] p-6 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.55)] backdrop-blur-xl"
                >
                  <header className="space-y-2">
                    <p className="text-[10px] uppercase tracking-[0.25em] text-red-800 dark:text-red-300/70">
                      Permanent action
                    </p>
                    <h2 className="text-base font-medium tracking-tight text-[var(--ink-1)]">
                      Delete this workspace?
                    </h2>
                    <p className="text-xs leading-relaxed text-[var(--ink-3)]">
                      <span className="text-[var(--ink-1)]">{workspaceTitle || "Untitled"}</span>{" "}
                      and all its nodes, connections and members will be permanently removed.
                      This can’t be undone.
                    </p>
                  </header>

                  <div className="mt-6 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmOpen(false)}
                      className="rounded-lg border border-[var(--border-soft)] px-3 py-1.5 text-xs text-[var(--ink-2)] transition-colors hover:bg-[var(--pane-2)] hover:text-[var(--ink-1)]"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={onConfirmDelete}
                      className={cn(
                        "rounded-lg border border-red-300 bg-red-100 px-3 py-1.5 text-xs font-medium text-red-800 transition-colors hover:bg-red-200 hover:border-red-400 dark:border-red-400/40 dark:bg-red-400/15 dark:text-red-100 dark:hover:bg-red-400/25",
                        pending && "cursor-wait opacity-70",
                      )}
                    >
                      {pending ? "Deleting…" : "Delete workspace"}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}

      <Toast message={toast} onDone={() => setToast(null)} />
    </div>
  );
}

function MenuItem({
  children,
  onClick,
  tone,
}: {
  children: React.ReactNode;
  onClick: () => void;
  tone?: "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-colors",
        tone === "danger"
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

function CopyIcon() {
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
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
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

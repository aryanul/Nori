"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/cn";
import { Toast } from "@/components/ui/Toast";
import {
  listWorkspaceMembers,
  regenerateInviteToken,
  regenerateViewToken,
  removeWorkspaceMember,
  type WorkspaceMember,
} from "@/lib/actions/workspace";

type Props = {
  workspaceId: string;
  inviteToken: string;
  viewToken: string | null;
  open: boolean;
  onClose: () => void;
};

type Mode = "edit" | "view";

export function ShareModal({
  workspaceId,
  inviteToken: initialInvite,
  viewToken: initialView,
  open,
  onClose,
}: Props) {
  const [inviteTokenState, setInviteTokenState] = useState(initialInvite);
  const [viewTokenState, setViewTokenState] = useState(initialView ?? "");
  const [mode, setMode] = useState<Mode>("edit");
  const [inviteUrl, setInviteUrl] = useState("");
  const [viewUrl, setViewUrl] = useState("");
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [regenPending, startRegen] = useTransition();

  useEffect(() => setMounted(true), []);
  useEffect(() => setInviteTokenState(initialInvite), [initialInvite]);
  useEffect(() => setViewTokenState(initialView ?? ""), [initialView]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setInviteUrl(
      `${window.location.origin}/w/${workspaceId}?invite=${inviteTokenState}`,
    );
    setViewUrl(
      viewTokenState
        ? `${window.location.origin}/w/${workspaceId}?view=${viewTokenState}`
        : "",
    );
  }, [workspaceId, inviteTokenState, viewTokenState]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 1800);
    return () => window.clearTimeout(t);
  }, [copied]);

  useEffect(() => {
    if (!open) return;
    setLoadingMembers(true);
    listWorkspaceMembers(workspaceId)
      .then((m) => setMembers(m))
      .catch((err) => console.warn("[ShareModal] member fetch failed", err))
      .finally(() => setLoadingMembers(false));
  }, [open, workspaceId]);

  const activeUrl = mode === "edit" ? inviteUrl : viewUrl;

  const onCopy = async () => {
    if (!activeUrl) return;
    try {
      await navigator.clipboard.writeText(activeUrl);
      setCopied(true);
      setToast(
        mode === "edit" ? "Edit link copied" : "View-only link copied",
      );
    } catch {
      setToast("Couldn't copy — select and copy manually");
    }
  };

  const onRemove = (memberId: string) => {
    const previous = members;
    setMembers((prev) => prev.filter((m) => m.id !== memberId));
    startRegen(async () => {
      const res = await removeWorkspaceMember(workspaceId, memberId);
      if (!res.ok) {
        setMembers(previous);
        setToast(res.error ?? "Couldn't remove member");
      }
    });
  };

  const onRegenerate = () => {
    startRegen(async () => {
      if (mode === "edit") {
        const res = await regenerateInviteToken(workspaceId);
        if (res.ok) {
          setInviteTokenState(res.token);
          setToast("New edit link generated. Old links won't work.");
        } else {
          setToast(res.error ?? "Couldn't regenerate link");
        }
      } else {
        const res = await regenerateViewToken(workspaceId);
        if (res.ok) {
          setViewTokenState(res.token);
          setToast("New view-only link generated. Old links won't work.");
        } else {
          setToast(res.error ?? "Couldn't regenerate link");
        }
      }
    });
  };

  if (!mounted) return null;

  const ownerMember = members.find((m) => m.isOwner);
  const otherMembers = members.filter((m) => !m.isOwner);

  // Portal first, then AnimatePresence inside it. Putting createPortal as a
  // child of AnimatePresence breaks exit animations because AnimatePresence
  // can't introspect through a portal node to find motion children.
  const portalContent = (
    <AnimatePresence>
      {open && (
        <motion.div
          key="share-backdrop"
          onPointerDown={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="pointer-events-auto fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-md"
        >
          <motion.div
            onPointerDown={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="relative w-full max-w-md overflow-hidden rounded-3xl border border-[var(--border-soft)] bg-[var(--surface-95)] p-6 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.55)] backdrop-blur-xl"
          >
                {/* glossy top edge */}
                <span className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[var(--highlight)] to-transparent" />

                <header className="space-y-1.5">
                  <h2 className="text-lg font-semibold tracking-tight text-[var(--ink-1)]">
                    Share this workspace
                  </h2>
                  <p className="text-xs leading-relaxed text-[var(--ink-3)]">
                    {mode === "edit"
                      ? "Anyone signed in who opens this link gets added as a member and can collaborate live."
                      : "Anyone signed in who opens this link can view the workspace but cannot edit it."}
                  </p>
                </header>

                {/* Edit / View-only toggle */}
                <div className="mt-5 inline-flex rounded-lg border border-[var(--border-soft)] bg-[var(--pane-1)] p-0.5 text-[10px] font-medium uppercase tracking-[0.18em]">
                  <button
                    type="button"
                    onClick={() => {
                      setMode("edit");
                      setCopied(false);
                    }}
                    className={cn(
                      "rounded-md px-3 py-1 transition-colors",
                      mode === "edit"
                        ? "bg-sky-100 text-sky-900 shadow-[inset_0_0_0_1px_rgb(125,211,252)] dark:bg-[#7ad7ff]/[0.14] dark:text-[var(--ink-1)] dark:shadow-[inset_0_0_0_1px_rgba(122,215,255,0.35)]"
                        : "text-[var(--ink-3)] hover:text-[var(--ink-1)]",
                    )}
                  >
                    Can edit
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode("view");
                      setCopied(false);
                    }}
                    className={cn(
                      "rounded-md px-3 py-1 transition-colors",
                      mode === "view"
                        ? "bg-amber-100 text-amber-900 shadow-[inset_0_0_0_1px_rgb(252,211,77)] dark:bg-amber-300/[0.14] dark:text-amber-200 dark:shadow-[inset_0_0_0_1px_rgba(245,205,122,0.40)]"
                        : "text-[var(--ink-3)] hover:text-[var(--ink-1)]",
                    )}
                  >
                    View only
                  </button>
                </div>

                <div className="mt-3 space-y-2">
                  <div className="flex items-baseline justify-between">
                    <label
                      htmlFor="share-url"
                      className="text-[10px] font-medium uppercase tracking-[0.25em] text-[var(--ink-3)]"
                    >
                      {mode === "edit" ? "Edit link" : "View-only link"}
                    </label>
                    <button
                      type="button"
                      onClick={onRegenerate}
                      disabled={regenPending}
                      className="text-[10px] uppercase tracking-wider text-[var(--ink-3)] transition-colors hover:text-[var(--ink-1)] disabled:opacity-50"
                    >
                      Regenerate
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <input
                      id="share-url"
                      readOnly
                      value={activeUrl}
                      onFocus={(e) => e.currentTarget.select()}
                      className="flex-1 cursor-text rounded-xl border border-[var(--border-soft)] bg-[var(--pane-1)] px-3 py-2 text-xs text-[var(--ink-1)] outline-none transition-colors focus:border-[var(--border-default)]"
                    />
                    <button
                      type="button"
                      onClick={onCopy}
                      className={cn(
                        "rounded-xl border px-3 py-2 text-xs font-medium transition-colors",
                        copied
                          ? "border-emerald-300 bg-emerald-100 text-emerald-900 dark:border-emerald-400/40 dark:bg-emerald-400/10 dark:text-emerald-200"
                          : "border-sky-300 bg-sky-100 text-sky-900 hover:bg-sky-200 hover:border-sky-400 dark:border-sky-400/40 dark:bg-sky-400/10 dark:text-sky-100 dark:hover:bg-sky-400/20",
                      )}
                    >
                      {copied ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>

                <div className="mt-6 space-y-3 border-t border-[var(--border-faint)] pt-5">
                  <h3 className="text-[10px] font-medium uppercase tracking-[0.25em] text-[var(--ink-3)]">
                    People with access
                  </h3>

                  {loadingMembers ? (
                    <p className="text-xs text-[var(--ink-4)]">Loading…</p>
                  ) : members.length === 0 ? (
                    <p className="text-xs text-[var(--ink-4)]">
                      Just you so far. Share the link above.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {ownerMember && (
                        <MemberRow member={ownerMember} canRemove={false} />
                      )}
                      {otherMembers.map((m) => (
                        <MemberRow
                          key={m.id}
                          member={m}
                          canRemove={!regenPending}
                          onRemove={() => onRemove(m.id)}
                        />
                      ))}
                    </ul>
                  )}
                </div>

          <div className="mt-6 flex justify-end border-t border-[var(--border-faint)] pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[var(--border-soft)] px-3 py-1.5 text-xs text-[var(--ink-2)] transition-colors hover:bg-[var(--pane-2)] hover:text-[var(--ink-1)]"
            >
              Done
            </button>
          </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      {createPortal(portalContent, document.body)}
      <Toast message={toast} onDone={() => setToast(null)} />
    </>
  );
}

function MemberRow({
  member,
  canRemove,
  onRemove,
}: {
  member: WorkspaceMember;
  canRemove: boolean;
  onRemove?: () => void;
}) {
  const initial = (member.name ?? member.email ?? "?")
    .trim()
    .slice(0, 1)
    .toUpperCase();
  return (
    <li className="flex items-center gap-3 rounded-xl border border-[var(--border-faint)] bg-[var(--pane-1)] px-3 py-2">
      {member.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={member.image}
          alt={member.name ?? ""}
          width={28}
          height={28}
          className="size-7 rounded-full border border-[var(--border-default)] object-cover"
        />
      ) : (
        <span className="flex size-7 items-center justify-center rounded-full border border-[var(--border-default)] bg-[var(--pane-3)] text-[11px] font-semibold text-[var(--ink-1)]">
          {initial}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs text-[var(--ink-1)]">
          {member.name ?? member.email ?? "Unknown user"}
        </p>
        {member.email && member.name && (
          <p className="truncate text-[10px] text-[var(--ink-4)]">{member.email}</p>
        )}
      </div>
      {member.isOwner ? (
        <span className="rounded-full border border-sky-300 bg-sky-100 px-2 py-0.5 text-[9px] uppercase tracking-wider text-sky-900 dark:border-sky-400/30 dark:bg-sky-400/10 dark:text-sky-200">
          Owner
        </span>
      ) : canRemove && onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          className="rounded-lg border border-[var(--border-soft)] px-2 py-1 text-[10px] uppercase tracking-wider text-[var(--ink-3)] transition-colors hover:border-red-400/40 hover:bg-red-400/10 hover:text-red-700 dark:hover:text-red-200"
        >
          Remove
        </button>
      ) : null}
    </li>
  );
}

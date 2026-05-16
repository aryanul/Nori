"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import { Toast } from "@/components/ui/Toast";

type Props = {
  workspaceId: string;
  inviteToken: string;
  memberCount: number;
  open: boolean;
  onClose: () => void;
};

export function ShareModal({
  workspaceId,
  inviteToken,
  memberCount,
  open,
  onClose,
}: Props) {
  const [inviteUrl, setInviteUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setInviteUrl(
      `${window.location.origin}/w/${workspaceId}?invite=${inviteToken}`,
    );
  }, [workspaceId, inviteToken]);

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

  const onCopy = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setToast("Invite link copied");
    } catch {
      setToast("Couldn’t copy — select and copy manually");
    }
  };

  if (!mounted) return null;

  return (
    <>
      {open &&
        createPortal(
          <div
            onPointerDown={onClose}
            className="pointer-events-auto fixed inset-0 z-[90] flex items-center justify-center bg-black/55 backdrop-blur-sm"
          >
            <div
              onPointerDown={(e) => e.stopPropagation()}
              className="w-full max-w-md space-y-5 rounded-3xl border border-white/10 bg-[#0c0d12]/95 p-6 backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
            >
              <header className="space-y-1.5">
                <h2 className="text-lg font-semibold tracking-tight text-white">
                  Share this workspace
                </h2>
                <p className="text-xs text-white/55">
                  Anyone signed in who opens this link gets added as a member
                  and can collaborate live.
                </p>
              </header>

              <div className="space-y-2">
                <label
                  htmlFor="invite-url"
                  className="block text-[10px] uppercase tracking-[0.25em] text-white/40"
                >
                  Invite link
                </label>
                <div className="flex gap-2">
                  <input
                    id="invite-url"
                    readOnly
                    value={inviteUrl}
                    onFocus={(e) => e.currentTarget.select()}
                    className="flex-1 cursor-text rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/80 outline-none focus:border-white/20"
                  />
                  <button
                    type="button"
                    onClick={onCopy}
                    className={cn(
                      "rounded-xl border px-3 py-2 text-xs font-medium transition-colors",
                      copied
                        ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200"
                        : "border-sky-400/40 bg-sky-400/10 text-sky-100 hover:bg-sky-400/20",
                    )}
                  >
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-white/5 pt-4 text-xs text-white/55">
                <span>
                  {memberCount === 0
                    ? "Just you so far"
                    : `${memberCount} other member${memberCount === 1 ? "" : "s"}`}
                </span>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-white/10 px-3 py-1.5 text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white"
                >
                  Done
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
      <Toast message={toast} onDone={() => setToast(null)} />
    </>
  );
}

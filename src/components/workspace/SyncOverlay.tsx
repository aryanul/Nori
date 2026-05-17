"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import type { RealtimeStatus } from "@/hooks/use-realtime";

type Props = { status: RealtimeStatus };

const COLD_START_HINT_AFTER_MS = 4000;

/**
 * Full-screen blocker shown until the sync server is reachable.
 *
 * On Render's free tier the Hocuspocus container sleeps after ~15 min of
 * idle and takes ~30s to cold-start. We don't want users to drag nodes
 * around in a half-connected state and lose edits — so we block the canvas
 * until the WS is up.
 */
export function SyncOverlay({ status }: Props) {
  const [mounted, setMounted] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => setMounted(true), []);

  const blocking =
    status === "connecting" ||
    status === "offline" ||
    status === "unauthorized";

  useEffect(() => {
    if (!blocking) {
      setElapsed(0);
      return;
    }
    const started = Date.now();
    const id = window.setInterval(() => {
      setElapsed(Date.now() - started);
    }, 250);
    return () => window.clearInterval(id);
  }, [blocking]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {blocking && (
        <motion.div
          key="sync-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="pointer-events-auto fixed inset-0 z-[140] flex items-center justify-center bg-[var(--bg)]/85 backdrop-blur-md"
        >
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-95)] p-7 text-center shadow-[0_30px_80px_-20px_rgba(0,0,0,0.55)] backdrop-blur-xl"
          >
            <span className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[var(--highlight)] to-transparent" />

            {status === "unauthorized" ? (
              <Unauthorized />
            ) : status === "offline" ? (
              <Offline />
            ) : (
              <Connecting elapsed={elapsed} />
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function Connecting({ elapsed }: { elapsed: number }) {
  const showColdStart = elapsed > COLD_START_HINT_AFTER_MS;
  const seconds = Math.floor(elapsed / 1000);

  return (
    <>
      <Spinner />
      <h2 className="mt-5 text-base font-medium tracking-tight text-[var(--ink-1)]">
        Connecting to sync server
      </h2>
      <p className="mt-2 text-xs leading-relaxed text-[var(--ink-2)]">
        {showColdStart
          ? "First connection after idle takes up to 30 seconds while the server wakes up. Your edits will sync as soon as we're connected."
          : "Setting up real-time collaboration…"}
      </p>
      {showColdStart && (
        <p className="mt-3 text-[10px] uppercase tracking-[0.22em] text-[var(--ink-4)]">
          {seconds}s elapsed
        </p>
      )}
    </>
  );
}

function Offline() {
  return (
    <>
      <ErrorIcon />
      <h2 className="mt-5 text-base font-medium tracking-tight text-[var(--ink-1)]">
        Can&rsquo;t reach the sync server
      </h2>
      <p className="mt-2 text-xs leading-relaxed text-[var(--ink-2)]">
        We waited 45 seconds and didn&rsquo;t hear back. Check your connection
        and try again — your local edits are safe.
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-5 rounded-lg border border-sky-300 bg-sky-100 px-4 py-2 text-xs font-medium text-sky-900 transition-colors hover:bg-sky-200 hover:border-sky-400 dark:border-sky-400/40 dark:bg-sky-400/10 dark:text-sky-100 dark:hover:bg-sky-400/20"
      >
        Retry
      </button>
    </>
  );
}

function Unauthorized() {
  return (
    <>
      <LockIcon />
      <h2 className="mt-5 text-base font-medium tracking-tight text-[var(--ink-1)]">
        Session expired
      </h2>
      <p className="mt-2 text-xs leading-relaxed text-[var(--ink-2)]">
        Your sync session expired or you no longer have access to this
        workspace. Refresh to sign in again.
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-5 rounded-lg border border-sky-300 bg-sky-100 px-4 py-2 text-xs font-medium text-sky-900 transition-colors hover:bg-sky-200 hover:border-sky-400 dark:border-sky-400/40 dark:bg-sky-400/10 dark:text-sky-100 dark:hover:bg-sky-400/20"
      >
        Refresh
      </button>
    </>
  );
}

function Spinner() {
  return (
    <div className="mx-auto flex size-12 items-center justify-center">
      <motion.div
        className="size-10 rounded-full border-2 border-[var(--border-soft)] border-t-sky-500"
        animate={{ rotate: 360 }}
        transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}

function ErrorIcon() {
  return (
    <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-red-100 text-red-700 dark:bg-red-400/15 dark:text-red-200">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <line x1="12" y1="2" x2="12" y2="14" />
        <circle cx="12" cy="19" r="1.2" fill="currentColor" />
      </svg>
    </div>
  );
}

function LockIcon() {
  return (
    <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-200">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="4" y="11" width="16" height="10" rx="2" />
        <path d="M8 11V8a4 4 0 0 1 8 0v3" />
      </svg>
    </div>
  );
}

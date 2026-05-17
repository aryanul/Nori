"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type ToastProps = {
  message: string | null;
  onDone: () => void;
  durationMs?: number;
};

/**
 * Tiny self-dismissing toast. Renders via Portal so it isn't constrained by
 * any pointer-events-none parents (e.g. the workspace overlay).
 */
export function Toast({ message, onDone, durationMs = 2000 }: ToastProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!message) return;
    const t = window.setTimeout(onDone, durationMs);
    return () => window.clearTimeout(t);
  }, [message, durationMs, onDone]);

  if (!mounted || !message) return null;

  return createPortal(
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed left-1/2 top-6 z-[100] -translate-x-1/2 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-95)] px-4 py-2 text-xs text-[var(--ink-1)] shadow-[0_10px_30px_rgba(0,0,0,0.45)] backdrop-blur-xl"
    >
      {message}
    </div>,
    document.body,
  );
}

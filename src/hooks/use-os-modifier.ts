"use client";

import { useEffect, useState } from "react";

export type OsModifier = {
  /** Short symbol — for compact UI like a kbd badge. */
  symbol: "⌘" | "Ctrl";
  /** Long name — for help text. */
  name: "Cmd" | "Ctrl";
  isMac: boolean;
};

const FALLBACK: OsModifier = { symbol: "Ctrl", name: "Ctrl", isMac: false };

function detect(): OsModifier {
  if (typeof navigator === "undefined") return FALLBACK;
  const ua = navigator.userAgent || "";
  const platform =
    (navigator as Navigator & { userAgentData?: { platform?: string } })
      .userAgentData?.platform ??
    (navigator as Navigator & { platform?: string }).platform ??
    "";
  const isMac =
    /Mac|iPhone|iPad|iPod/i.test(ua) || /Mac/i.test(platform);
  return isMac
    ? { symbol: "⌘", name: "Cmd", isMac: true }
    : { symbol: "Ctrl", name: "Ctrl", isMac: false };
}

/**
 * Returns the platform-appropriate command modifier — `⌘`/`Cmd` on macOS,
 * `Ctrl` everywhere else. Render-safe (returns Ctrl during SSR, swaps to
 * the real value on mount).
 */
export function useOsModifier(): OsModifier {
  const [mod, setMod] = useState<OsModifier>(FALLBACK);
  useEffect(() => setMod(detect()), []);
  return mod;
}

"use client";

import { useCallback, useEffect, useState } from "react";

export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "nori:theme";

function readStored(): ThemePreference {
  if (typeof window === "undefined") return "system";
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (v === "light" || v === "dark" || v === "system") return v;
  } catch {
    // ignore
  }
  return "system";
}

function systemPrefersLight(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: light)").matches;
}

function resolve(pref: ThemePreference): ResolvedTheme {
  if (pref === "system") return systemPrefersLight() ? "light" : "dark";
  return pref;
}

function apply(resolved: ResolvedTheme) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", resolved);
}

/**
 * `preference` is the user's intent ("system" | "light" | "dark").
 * `resolved` is what's actually painting right now ("light" | "dark") —
 * derived from `preference`, falling back to the OS media query when set
 * to "system". The hook also re-resolves automatically when the OS theme
 * changes while `preference === "system"`.
 */
export function useTheme() {
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  const [resolved, setResolvedState] = useState<ResolvedTheme>("dark");

  // Initial read + apply
  useEffect(() => {
    const pref = readStored();
    const res = resolve(pref);
    setPreferenceState(pref);
    setResolvedState(res);
    apply(res);
  }, []);

  // Re-react to OS theme changes when we're following the system
  useEffect(() => {
    if (preference !== "system" || typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => {
      const res: ResolvedTheme = mq.matches ? "light" : "dark";
      setResolvedState(res);
      apply(res);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [preference]);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
    const res = resolve(next);
    setResolvedState(res);
    apply(res);
  }, []);

  const cycle = useCallback(() => {
    const order: ThemePreference[] = ["system", "light", "dark"];
    setPreference(order[(order.indexOf(preference) + 1) % order.length]);
  }, [preference, setPreference]);

  return { preference, resolved, setPreference, cycle };
}

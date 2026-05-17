"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  credentialsSignInAction,
  type AuthFormState,
} from "@/lib/actions/auth";

const INITIAL: AuthFormState = { error: null };

type Props = { redirectTo: string };

export function CredentialsForm({ redirectTo }: Props) {
  const [state, formAction, pending] = useActionState(
    credentialsSignInAction,
    INITIAL,
  );

  const signUpHref =
    redirectTo && redirectTo !== "/"
      ? `/sign-up?from=${encodeURIComponent(redirectTo)}`
      : "/sign-up";

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <div className="space-y-1.5">
        <label
          htmlFor="email"
          className="block text-[10px] uppercase tracking-[0.25em] text-[var(--ink-3)]"
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="w-full rounded-xl border border-[var(--border-soft)] bg-[var(--pane-1)] px-3 py-2.5 text-sm text-[var(--ink-1)] outline-none transition-colors placeholder:text-[var(--ink-4)] focus:border-[var(--border-strong)] focus:bg-[var(--pane-2)]"
          placeholder="you@example.com"
        />
      </div>
      <div className="space-y-1.5">
        <label
          htmlFor="password"
          className="block text-[10px] uppercase tracking-[0.25em] text-[var(--ink-3)]"
        >
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="w-full rounded-xl border border-[var(--border-soft)] bg-[var(--pane-1)] px-3 py-2.5 text-sm text-[var(--ink-1)] outline-none transition-colors placeholder:text-[var(--ink-4)] focus:border-[var(--border-strong)] focus:bg-[var(--pane-2)]"
          placeholder="••••••••"
        />
      </div>

      {state.error && (
        <p className="rounded-lg border border-red-400/40 bg-red-400/10 px-3 py-2 text-xs text-red-800 dark:text-red-200">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl border border-sky-300 bg-sky-100 px-4 py-2.5 text-sm font-medium text-sky-900 transition-colors hover:bg-sky-200 hover:border-sky-400 disabled:cursor-wait disabled:opacity-60 dark:border-sky-400/40 dark:bg-sky-400/10 dark:text-sky-100 dark:hover:bg-sky-400/20"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>

      <p className="text-center text-xs text-[var(--ink-3)]">
        No account?{" "}
        <Link
          href={signUpHref}
          className="text-sky-900 underline-offset-2 hover:underline dark:text-sky-200"
        >
          Create one
        </Link>
      </p>
    </form>
  );
}

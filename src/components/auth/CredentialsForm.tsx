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
          className="block text-[10px] uppercase tracking-[0.25em] text-white/40"
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-white/30 focus:border-white/30 focus:bg-white/[0.06]"
          placeholder="you@example.com"
        />
      </div>
      <div className="space-y-1.5">
        <label
          htmlFor="password"
          className="block text-[10px] uppercase tracking-[0.25em] text-white/40"
        >
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-white/30 focus:border-white/30 focus:bg-white/[0.06]"
          placeholder="••••••••"
        />
      </div>

      {state.error && (
        <p className="rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-xs text-red-200">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl border border-sky-400/40 bg-sky-400/10 px-4 py-2.5 text-sm font-medium text-sky-100 transition-colors hover:bg-sky-400/20 disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>

      <p className="text-center text-xs text-white/50">
        No account?{" "}
        <Link
          href={signUpHref}
          className="text-sky-200 underline-offset-2 hover:underline"
        >
          Create one
        </Link>
      </p>
    </form>
  );
}

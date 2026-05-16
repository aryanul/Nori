"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUpAction, type AuthFormState } from "@/lib/actions/auth";

const INITIAL: AuthFormState = { error: null };

type Props = { redirectTo: string };

export function SignUpForm({ redirectTo }: Props) {
  const [state, formAction, pending] = useActionState(signUpAction, INITIAL);

  const signInHref =
    redirectTo && redirectTo !== "/"
      ? `/sign-in?from=${encodeURIComponent(redirectTo)}`
      : "/sign-in";

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <div className="space-y-1.5">
        <label
          htmlFor="name"
          className="block text-[10px] uppercase tracking-[0.25em] text-white/40"
        >
          Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-white/30 focus:border-white/30 focus:bg-white/[0.06]"
          placeholder="Optional"
        />
      </div>
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
          minLength={8}
          autoComplete="new-password"
          className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-white/30 focus:border-white/30 focus:bg-white/[0.06]"
          placeholder="At least 8 characters"
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
        {pending ? "Creating account…" : "Create account"}
      </button>

      <p className="text-center text-xs text-white/50">
        Already have an account?{" "}
        <Link
          href={signInHref}
          className="text-sky-200 underline-offset-2 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}

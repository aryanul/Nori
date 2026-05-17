"use client";

import { signOutAction } from "@/lib/actions/auth";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

type Props = {
  name: string | null | undefined;
  image: string | null | undefined;
};

export function UserMenu({ name, image }: Props) {
  const initial = (name ?? "?").trim().slice(0, 1).toUpperCase();
  return (
    <div className="pointer-events-auto flex items-center gap-2 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-85)] px-2 py-1.5 text-xs text-[var(--ink-2)] backdrop-blur-xl">
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt={name ?? "User"}
          width={20}
          height={20}
          className="size-5 rounded-full border border-[var(--border-default)] object-cover"
        />
      ) : (
        <span className="flex size-5 items-center justify-center rounded-full bg-[var(--pane-3)] text-[10px] font-semibold text-[var(--ink-1)]">
          {initial}
        </span>
      )}
      <span className="hidden max-w-[110px] truncate text-[var(--ink-1)] md:inline">
        {name ?? "Signed in"}
      </span>
      <span className="h-3.5 w-px bg-[var(--border-soft)]" />
      <ThemeToggle />
      <span className="h-3.5 w-px bg-[var(--border-soft)]" />
      <form action={signOutAction}>
        <button
          type="submit"
          className="rounded-lg px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-[var(--ink-3)] transition-colors hover:bg-[var(--pane-2)] hover:text-[var(--ink-1)]"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}

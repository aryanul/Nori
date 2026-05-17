"use client";

import { signOutAction } from "@/lib/actions/auth";

type Props = {
  name: string | null | undefined;
  image: string | null | undefined;
};

export function UserMenu({ name, image }: Props) {
  const initial = (name ?? "?").trim().slice(0, 1).toUpperCase();
  return (
    <div className="pointer-events-auto flex items-center gap-2 rounded-xl border border-white/[0.09] bg-[#0a0b10]/85 px-2 py-1.5 text-xs text-white/65 backdrop-blur-xl">
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt={name ?? "User"}
          width={20}
          height={20}
          className="size-5 rounded-full border border-white/15 object-cover"
        />
      ) : (
        <span className="flex size-5 items-center justify-center rounded-full bg-white/10 text-[10px] font-semibold text-white/85">
          {initial}
        </span>
      )}
      <span className="hidden max-w-[110px] truncate text-white/75 md:inline">
        {name ?? "Signed in"}
      </span>
      <form action={signOutAction}>
        <button
          type="submit"
          className="rounded-lg px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-white/45 transition-colors hover:bg-white/[0.06] hover:text-white"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}

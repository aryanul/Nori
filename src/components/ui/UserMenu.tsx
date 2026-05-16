"use client";

import { signOutAction } from "@/lib/actions/auth";

type Props = {
  name: string | null | undefined;
  image: string | null | undefined;
};

export function UserMenu({ name, image }: Props) {
  const initial = (name ?? "?").trim().slice(0, 1).toUpperCase();
  return (
    <div className="pointer-events-auto flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-2 py-1.5 text-xs text-white/70 backdrop-blur-xl">
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt={name ?? "User"}
          width={22}
          height={22}
          className="size-[22px] rounded-full border border-white/15 object-cover"
        />
      ) : (
        <span className="flex size-[22px] items-center justify-center rounded-full border border-white/15 bg-white/10 text-[10px] font-semibold text-white">
          {initial}
        </span>
      )}
      <span className="max-w-[100px] truncate text-white/75">
        {name ?? "Signed in"}
      </span>
      <form action={signOutAction}>
        <button
          type="submit"
          className="rounded-lg border border-white/10 px-2 py-0.5 text-white/60 transition-colors hover:bg-white/[0.06] hover:text-white"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}

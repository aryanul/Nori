"use client";

import { useState } from "react";
import { ShareModal } from "./ShareModal";

type Props = {
  workspaceId: string;
  inviteToken: string;
  memberCount: number;
};

export function ShareButton({
  workspaceId,
  inviteToken,
  memberCount,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="pointer-events-auto flex items-center gap-1.5 rounded-2xl border border-sky-400/40 bg-sky-400/10 px-3 py-2 text-xs font-medium text-sky-100 backdrop-blur-xl transition-colors hover:bg-sky-400/20"
      >
        <svg
          viewBox="0 0 24 24"
          width="14"
          height="14"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
        Share
      </button>
      <ShareModal
        workspaceId={workspaceId}
        inviteToken={inviteToken}
        memberCount={memberCount}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

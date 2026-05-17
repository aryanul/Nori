"use client";

import { useState } from "react";
import { ShareModal } from "./ShareModal";

type Props = {
  workspaceId: string;
  inviteToken: string;
  viewToken: string | null;
};

export function ShareButton({ workspaceId, inviteToken, viewToken }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className="pointer-events-auto inline-flex items-center gap-1.5 rounded-xl border border-sky-300 bg-sky-100 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-sky-900 backdrop-blur-xl transition-colors hover:bg-sky-200 hover:border-sky-400 dark:border-[#7ad7ff]/45 dark:bg-[#7ad7ff]/[0.10] dark:text-[#bde8ff] dark:hover:border-[#7ad7ff]/65 dark:hover:bg-[#7ad7ff]/[0.16]"
      >
        <svg
          viewBox="0 0 24 24"
          width="12"
          height="12"
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
        viewToken={viewToken}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

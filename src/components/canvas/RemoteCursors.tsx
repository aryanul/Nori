"use client";

import type { PeerState } from "@/types/realtime";

type Props = { peers: PeerState[] };

export function RemoteCursors({ peers }: Props) {
  return (
    <>
      {peers.map((peer) => {
        if (!peer.cursor) return null;
        return (
          <div
            key={peer.clientId}
            data-export-skip
            className="pointer-events-none absolute z-10"
            style={{
              left: peer.cursor.x,
              top: peer.cursor.y,
              willChange: "transform",
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              style={{
                filter: `drop-shadow(0 2px 4px rgba(0,0,0,0.45))`,
              }}
            >
              <path
                d="M3 2 L15 9 L9 10.5 L7 16 Z"
                fill={peer.user.color}
                stroke="rgba(0,0,0,0.35)"
                strokeWidth="0.5"
              />
            </svg>
            <span
              className="absolute left-4 top-3 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[10px] font-medium text-white shadow-sm"
              style={{
                backgroundColor: peer.user.color,
              }}
            >
              {peer.user.name}
            </span>
          </div>
        );
      })}
    </>
  );
}

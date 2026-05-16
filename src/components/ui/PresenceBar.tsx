"use client";

import type { PeerState, UserIdentity } from "@/types/realtime";
import type { RealtimeStatus } from "@/hooks/use-realtime";

type Props = {
  self: UserIdentity | null;
  peers: PeerState[];
  status: RealtimeStatus;
};

function Avatar({
  color,
  name,
  size = 22,
}: {
  color: string;
  name: string;
  size?: number;
}) {
  const initial = name.trim().slice(0, 1).toUpperCase() || "?";
  return (
    <div
      className="flex items-center justify-center rounded-full border border-white/20 text-[10px] font-semibold text-white/95 shadow-[0_0_0_2px_rgba(7,8,12,1)]"
      style={{ width: size, height: size, backgroundColor: color }}
      title={name}
    >
      {initial}
    </div>
  );
}

const STATUS_META: Record<
  RealtimeStatus,
  { label: (peerCount: number) => string; dotClass: string; tooltip: string }
> = {
  connecting: {
    label: () => "Connecting…",
    dotClass: "bg-amber-300/80 shadow-[0_0_10px_rgba(252,211,77,0.55)] animate-pulse",
    tooltip: "Looking for other peers via WebRTC signaling",
  },
  live: {
    label: (n) => `${n + 1} in this workspace`,
    dotClass: "bg-emerald-400/90 shadow-[0_0_10px_rgba(52,211,153,0.65)]",
    tooltip: "Connected via WebRTC — edits sync live",
  },
  solo: {
    label: () => "Solo — waiting for peers",
    dotClass: "bg-sky-300/70",
    tooltip:
      "Signaling is connected but no peers found. Share the URL with someone else, or open another tab.",
  },
  offline: {
    label: () => "Realtime offline",
    dotClass: "bg-red-400/80",
    tooltip:
      "Couldn’t reach the sync server. Make sure `npm run hocuspocus` is running. Edits stay local until reconnect.",
  },
  unauthorized: {
    label: () => "Sign-in required",
    dotClass: "bg-red-400/80",
    tooltip:
      "Your sync session expired or you don’t have access to this workspace. Refresh the page or sign in again.",
  },
};

export function PresenceBar({ self, peers, status }: Props) {
  const meta = STATUS_META[status];
  return (
    <div
      className="pointer-events-auto flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/70 backdrop-blur-xl"
      title={meta.tooltip}
    >
      <span className={`size-2 rounded-full ${meta.dotClass}`} />
      <span>{meta.label(peers.length)}</span>
      <div className="ml-1 flex -space-x-1.5">
        {self && <Avatar color={self.color} name={self.name} />}
        {peers.slice(0, 4).map((p) => (
          <Avatar key={p.clientId} color={p.user.color} name={p.user.name} />
        ))}
        {peers.length > 4 && (
          <div className="flex size-[22px] items-center justify-center rounded-full border border-white/20 bg-white/10 text-[10px] font-semibold text-white/80 shadow-[0_0_0_2px_rgba(7,8,12,1)]">
            +{peers.length - 4}
          </div>
        )}
      </div>
    </div>
  );
}

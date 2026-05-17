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
  size = 20,
}: {
  color: string;
  name: string;
  size?: number;
}) {
  const initial = name.trim().slice(0, 1).toUpperCase() || "?";
  return (
    <div
      className="flex items-center justify-center rounded-full text-[10px] font-semibold text-white/95 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18),0_0_0_2px_#0a0b10]"
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
    label: () => "Connecting",
    dotClass:
      "bg-amber-300/85 shadow-[0_0_8px_rgba(252,211,77,0.55)] animate-pulse",
    tooltip: "Looking for other peers via WebRTC signaling",
  },
  live: {
    label: (n) => `${n + 1} live`,
    dotClass: "bg-emerald-400/90 shadow-[0_0_8px_rgba(52,211,153,0.55)]",
    tooltip: "Connected — edits sync live",
  },
  solo: {
    label: () => "Solo",
    dotClass: "bg-white/35",
    tooltip:
      "Signaling is connected but no peers found. Share the URL to collaborate.",
  },
  offline: {
    label: () => "Offline",
    dotClass: "bg-red-400/80",
    tooltip:
      "Couldn’t reach the sync server. Make sure `npm run hocuspocus` is running. Edits stay local.",
  },
  unauthorized: {
    label: () => "Auth required",
    dotClass: "bg-red-400/80",
    tooltip:
      "Your sync session expired or you don’t have access. Refresh the page.",
  },
};

export function PresenceBar({ self, peers, status }: Props) {
  const meta = STATUS_META[status];
  return (
    <div
      className="pointer-events-auto flex items-center gap-2.5 rounded-xl border border-white/[0.09] bg-[#0a0b10]/85 px-3 py-1.5 text-xs text-white/65 backdrop-blur-xl"
      title={meta.tooltip}
    >
      <span className="flex items-center gap-1.5">
        <span className={`size-1.5 rounded-full ${meta.dotClass}`} />
        <span className="text-[10px] uppercase tracking-[0.18em] text-white/50">
          {meta.label(peers.length)}
        </span>
      </span>
      {(self || peers.length > 0) && (
        <>
          <span className="h-3.5 w-px bg-white/10" />
          <div className="flex -space-x-1.5">
            {self && <Avatar color={self.color} name={self.name} />}
            {peers.slice(0, 4).map((p) => (
              <Avatar key={p.clientId} color={p.user.color} name={p.user.name} />
            ))}
            {peers.length > 4 && (
              <div className="flex size-5 items-center justify-center rounded-full bg-white/10 text-[9px] font-semibold text-white/80 shadow-[0_0_0_2px_#0a0b10]">
                +{peers.length - 4}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

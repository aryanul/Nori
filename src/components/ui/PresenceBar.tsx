"use client";

import { useCanvasStore } from "@/store/canvas-store";
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
  onClick,
  active,
}: {
  color: string;
  name: string;
  size?: number;
  onClick?: () => void;
  active?: boolean;
}) {
  const initial = name.trim().slice(0, 1).toUpperCase() || "?";
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      title={onClick ? `Jump to ${name}` : name}
      className={
        "flex items-center justify-center rounded-full text-[10px] font-semibold text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18),0_0_0_2px_var(--surface-85)] " +
        (onClick
          ? "cursor-pointer transition-transform hover:scale-110 active:scale-95"
          : "") +
        (active ? " ring-1 ring-[var(--ink-3)]" : "")
      }
      style={{ width: size, height: size, backgroundColor: color }}
    >
      {initial}
    </Tag>
  );
}

const STATUS_META: Record<
  RealtimeStatus,
  { label: (peerCount: number) => string; dotClass: string; tooltip: string }
> = {
  connecting: {
    label: () => "Connecting",
    dotClass:
      "bg-amber-400/85 shadow-[0_0_8px_rgba(252,211,77,0.55)] animate-pulse",
    tooltip: "Connecting to the sync server",
  },
  live: {
    label: (n) => `${n + 1} live`,
    dotClass: "bg-emerald-500/90 shadow-[0_0_8px_rgba(52,211,153,0.55)]",
    tooltip: "Connected — edits sync live. Click an avatar to jump to them.",
  },
  solo: {
    label: () => "Solo",
    dotClass: "bg-[var(--ink-4)]",
    tooltip:
      "Signaling is connected but no peers found. Share the URL to collaborate.",
  },
  offline: {
    label: () => "Offline",
    dotClass: "bg-red-500/80",
    tooltip:
      "Couldn’t reach the sync server. Make sure `npm run hocuspocus` is running. Edits stay local.",
  },
  unauthorized: {
    label: () => "Auth required",
    dotClass: "bg-red-500/80",
    tooltip:
      "Your sync session expired or you don’t have access. Refresh the page.",
  },
};

export function PresenceBar({ self, peers, status }: Props) {
  const meta = STATUS_META[status];
  const flyToPoint = useCanvasStore((s) => s.flyToPoint);

  return (
    <div
      className="pointer-events-auto flex items-center gap-2.5 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-85)] px-3 py-1.5 text-xs text-[var(--ink-2)] backdrop-blur-xl"
      title={meta.tooltip}
    >
      <span className="flex items-center gap-1.5">
        <span className={`size-1.5 rounded-full ${meta.dotClass}`} />
        <span className="text-[10px] uppercase tracking-[0.18em] text-[var(--ink-3)]">
          {meta.label(peers.length)}
        </span>
      </span>
      {(self || peers.length > 0) && (
        <>
          <span className="h-3.5 w-px bg-[var(--border-soft)]" />
          <div className="flex -space-x-1.5">
            {self && <Avatar color={self.color} name={self.name} />}
            {peers.slice(0, 4).map((p) => (
              <Avatar
                key={p.clientId}
                color={p.user.color}
                name={p.user.name}
                active={!!p.cursor}
                onClick={
                  p.cursor
                    ? () => flyToPoint(p.cursor!.x, p.cursor!.y)
                    : undefined
                }
              />
            ))}
            {peers.length > 4 && (
              <div className="flex size-5 items-center justify-center rounded-full bg-[var(--pane-3)] text-[9px] font-semibold text-[var(--ink-1)] shadow-[0_0_0_2px_var(--surface-85)]">
                +{peers.length - 4}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

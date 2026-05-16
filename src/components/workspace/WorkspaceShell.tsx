"use client";

import { useEffect } from "react";
import { useCanvasStore } from "@/store/canvas-store";
import { useRealtime } from "@/hooks/use-realtime";
import { InfiniteCanvas } from "@/components/canvas/InfiniteCanvas";
import { Toolbar } from "@/components/ui/Toolbar";
import { PresenceBar } from "@/components/ui/PresenceBar";
import type { WorkspaceSnapshot } from "@/lib/actions/workspace";

type Props = { snapshot: WorkspaceSnapshot };

export function WorkspaceShell({ snapshot }: Props) {
  const hydrate = useCanvasStore((s) => s.hydrate);

  // 1) hydrate from server snapshot first so the canvas renders something
  //    immediately (and so useRealtime's seed has data to push to Y.Map)
  useEffect(() => {
    hydrate({
      workspaceId: snapshot.id,
      nodes: snapshot.nodes,
      connections: snapshot.connections,
    });
  }, [snapshot, hydrate]);

  // 2) realtime layer attaches and bridges Y.Doc <-> store
  const { self, peers, publishCursor, status } = useRealtime(snapshot.id);

  return (
    <main className="relative h-dvh w-dvw overflow-hidden">
      <InfiniteCanvas onCursorMove={publishCursor} peers={peers} />
      <div className="pointer-events-none absolute inset-0 flex items-start justify-between p-4">
        <Toolbar workspaceTitle={snapshot.title} />
        <PresenceBar self={self} peers={peers} status={status} />
      </div>
    </main>
  );
}

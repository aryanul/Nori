"use client";

import { useEffect } from "react";
import { useCanvasStore } from "@/store/canvas-store";
import { InfiniteCanvas } from "@/components/canvas/InfiniteCanvas";
import { Toolbar } from "@/components/ui/Toolbar";
import { PresenceBar } from "@/components/ui/PresenceBar";
import type { WorkspaceSnapshot } from "@/lib/actions/workspace";

type Props = { snapshot: WorkspaceSnapshot };

export function WorkspaceShell({ snapshot }: Props) {
  const hydrate = useCanvasStore((s) => s.hydrate);

  useEffect(() => {
    hydrate({
      workspaceId: snapshot.id,
      nodes: snapshot.nodes,
      connections: snapshot.connections,
    });
  }, [snapshot, hydrate]);

  return (
    <main className="relative h-dvh w-dvw overflow-hidden">
      <InfiniteCanvas />
      <div className="pointer-events-none absolute inset-0 flex items-start justify-between p-4">
        <Toolbar workspaceTitle={snapshot.title} />
        <PresenceBar />
      </div>
    </main>
  );
}

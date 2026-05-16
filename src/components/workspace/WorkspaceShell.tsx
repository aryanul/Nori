"use client";

import { useEffect } from "react";
import { useCanvasStore } from "@/store/canvas-store";
import { useRealtime } from "@/hooks/use-realtime";
import { InfiniteCanvas } from "@/components/canvas/InfiniteCanvas";
import { Toolbar } from "@/components/ui/Toolbar";
import { PresenceBar } from "@/components/ui/PresenceBar";
import { UserMenu } from "@/components/ui/UserMenu";
import { ShareButton } from "@/components/workspace/ShareButton";
import type { WorkspaceSnapshot } from "@/lib/actions/workspace";

type Props = {
  snapshot: WorkspaceSnapshot;
  viewer: { name: string | null; image: string | null } | null;
};

export function WorkspaceShell({ snapshot, viewer }: Props) {
  const hydrate = useCanvasStore((s) => s.hydrate);

  useEffect(() => {
    hydrate({
      workspaceId: snapshot.id,
      nodes: snapshot.nodes,
      connections: snapshot.connections,
    });
  }, [snapshot, hydrate]);

  // Strip the ?invite= query param from the URL once we've rendered the
  // workspace — the join already happened server-side, no need to keep the
  // token visible in the address bar.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (url.searchParams.has("invite")) {
      url.searchParams.delete("invite");
      window.history.replaceState(null, "", url.pathname + url.search);
    }
  }, []);

  const { self, peers, publishCursor, status } = useRealtime(snapshot.id);

  return (
    <main className="relative h-dvh w-dvw overflow-hidden">
      <InfiniteCanvas onCursorMove={publishCursor} peers={peers} />
      <div className="pointer-events-none absolute inset-0 flex items-start justify-between p-4">
        <Toolbar workspaceTitle={snapshot.title} />
        <div className="flex items-start gap-2">
          {snapshot.isOwner && snapshot.inviteToken && (
            <ShareButton
              workspaceId={snapshot.id}
              inviteToken={snapshot.inviteToken}
              memberCount={snapshot.memberCount}
            />
          )}
          <PresenceBar self={self} peers={peers} status={status} />
          {viewer && <UserMenu name={viewer.name} image={viewer.image} />}
        </div>
      </div>
    </main>
  );
}

"use client";

import { useEffect } from "react";
import { useCanvasStore } from "@/store/canvas-store";
import { useRealtime } from "@/hooks/use-realtime";
import { InfiniteCanvas } from "@/components/canvas/InfiniteCanvas";
import { Toolbar } from "@/components/ui/Toolbar";
import { PresenceBar } from "@/components/ui/PresenceBar";
import { UserMenu } from "@/components/ui/UserMenu";
import { ShareButton } from "@/components/workspace/ShareButton";
import { ToolPalette } from "@/components/canvas/ToolPalette";
import { ShortcutsHelp } from "@/components/canvas/ShortcutsHelp";
import { WorkspaceHotkeys } from "@/components/workspace/WorkspaceHotkeys";
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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (url.searchParams.has("invite")) {
      url.searchParams.delete("invite");
      window.history.replaceState(null, "", url.pathname + url.search);
    }
  }, []);

  const { self, peers, publishCursor, status, undo, redo } = useRealtime(
    snapshot.id,
  );

  return (
    <main className="relative h-dvh w-dvw overflow-hidden">
      <InfiniteCanvas onCursorMove={publishCursor} peers={peers} />

      {/* Top bar — title, share, presence, user */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-4">
        <Toolbar
          workspaceId={snapshot.id}
          workspaceTitle={snapshot.title}
          canEditTitle={snapshot.isOwner}
        />
        <div className="flex items-start gap-2">
          {snapshot.isOwner && snapshot.inviteToken && (
            <ShareButton
              workspaceId={snapshot.id}
              inviteToken={snapshot.inviteToken}
            />
          )}
          <PresenceBar self={self} peers={peers} status={status} />
          {viewer && <UserMenu name={viewer.name} image={viewer.image} />}
        </div>
      </div>

      {/* Floating tool palette — bottom center */}
      <div className="pointer-events-none absolute inset-x-0 bottom-5 flex justify-center">
        <ToolPalette />
      </div>

      {/* Keyboard-shortcuts overlay (press ?) */}
      <ShortcutsHelp />

      {/* Document-level hotkeys (undo/redo, Cmd+A, Esc, V/C/S/F) */}
      <WorkspaceHotkeys onUndo={undo} onRedo={redo} />
    </main>
  );
}

"use client";

import { useEffect, useRef } from "react";
import { useCanvasStore } from "@/store/canvas-store";
import { useRealtime } from "@/hooks/use-realtime";
import { InfiniteCanvas } from "@/components/canvas/InfiniteCanvas";
import { Toolbar } from "@/components/ui/Toolbar";
import { PresenceBar } from "@/components/ui/PresenceBar";
import { UserMenu } from "@/components/ui/UserMenu";
import { ShareButton } from "@/components/workspace/ShareButton";
import { ToolPalette } from "@/components/canvas/ToolPalette";
import { ShortcutsHelp } from "@/components/canvas/ShortcutsHelp";
import { CommandPalette } from "@/components/canvas/CommandPalette";
import { ContextMenu } from "@/components/canvas/ContextMenu";
import { WorkspaceHotkeys } from "@/components/workspace/WorkspaceHotkeys";
import { FirstRunTutorial } from "@/components/workspace/FirstRunTutorial";
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
      readOnly: !snapshot.canEdit,
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

  // Ref to the world-transform wrapper inside InfiniteCanvas. Used by the
  // ContextMenu so the export helper can capture the right element.
  const worldRef = useRef<HTMLDivElement | null>(null);

  return (
    <main className="relative h-dvh w-dvw overflow-hidden">
      <InfiniteCanvas
        onCursorMove={publishCursor}
        peers={peers}
        worldRef={worldRef}
      />

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
              viewToken={snapshot.viewToken}
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

      {/* Cmd+K command palette */}
      <CommandPalette onUndo={undo} onRedo={redo} />

      {/* Right-click context menu (export / delete) */}
      <ContextMenu
        workspaceTitle={snapshot.title}
        worldWrapperRef={worldRef}
      />

      {/* Document-level hotkeys (undo/redo, Cmd+A, Esc, V/C/S/F) */}
      <WorkspaceHotkeys onUndo={undo} onRedo={redo} />

      {/* First-run tutorial — only shown on first ever workspace visit */}
      <FirstRunTutorial />
    </main>
  );
}

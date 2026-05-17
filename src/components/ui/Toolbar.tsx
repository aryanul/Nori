"use client";

import Image from "next/image";
import { useCanvasStore } from "@/store/canvas-store";
import { EditableTitle } from "@/components/workspace/EditableTitle";
import { WorkspaceSettingsMenu } from "@/components/workspace/WorkspaceSettingsMenu";

type Props = {
  workspaceId?: string;
  workspaceTitle?: string;
  canEditTitle?: boolean;
};

export function Toolbar({
  workspaceId,
  workspaceTitle,
  canEditTitle = false,
}: Props) {
  const scale = useCanvasStore((s) => s.viewport.scale);
  const reset = useCanvasStore((s) => s.resetViewport);
  const readOnly = useCanvasStore((s) => s.readOnly);

  return (
    <div className="pointer-events-auto flex items-center gap-3 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-85)] px-3 py-1.5 text-xs text-[var(--ink-2)] backdrop-blur-xl">
      <Image
        src="/nori-logo.png"
        alt="Nori"
        width={20}
        height={20}
        className="rounded-[5px]"
      />
      <span className="h-3.5 w-px bg-[var(--border-soft)]" />
      {workspaceId ? (
        <EditableTitle
          workspaceId={workspaceId}
          initialTitle={workspaceTitle ?? "Untitled workspace"}
          editable={canEditTitle}
        />
      ) : (
        <span className="max-w-[220px] truncate text-[var(--ink-2)]">
          {workspaceTitle ?? "Playground"}
        </span>
      )}
      {readOnly && (
        <>
          <span className="h-3.5 w-px bg-[var(--border-soft)]" />
          <span
            className="rounded-md border border-amber-300 bg-amber-100 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.18em] text-amber-900 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200"
            title="You can view this workspace but not edit it"
          >
            View only
          </span>
        </>
      )}
      <span className="h-3.5 w-px bg-[var(--border-soft)]" />
      <span className="tabular-nums text-[var(--ink-3)]">
        {Math.round(scale * 100)}%
      </span>
      <button
        type="button"
        onClick={reset}
        title="Reset viewport"
        className="rounded-lg px-2 py-1 text-[var(--ink-3)] transition-colors hover:bg-[var(--pane-2)] hover:text-[var(--ink-1)]"
      >
        Reset
      </button>
      {workspaceId && (
        <>
          <span className="h-3.5 w-px bg-[var(--border-soft)]" />
          <WorkspaceSettingsMenu
            workspaceId={workspaceId}
            workspaceTitle={workspaceTitle ?? ""}
            isOwner={canEditTitle}
          />
        </>
      )}
    </div>
  );
}

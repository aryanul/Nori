"use client";

import Image from "next/image";
import { useCanvasStore } from "@/store/canvas-store";
import { EditableTitle } from "@/components/workspace/EditableTitle";

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

  return (
    <div className="pointer-events-auto flex items-center gap-3 rounded-xl border border-white/[0.09] bg-[#0a0b10]/85 px-3 py-1.5 text-xs text-white/70 backdrop-blur-xl">
      <Image
        src="/nori-logo.png"
        alt="Nori"
        width={20}
        height={20}
        className="rounded-[5px]"
      />
      <span className="h-3.5 w-px bg-white/10" />
      {workspaceId ? (
        <EditableTitle
          workspaceId={workspaceId}
          initialTitle={workspaceTitle ?? "Untitled workspace"}
          editable={canEditTitle}
        />
      ) : (
        <span className="max-w-[220px] truncate text-white/65">
          {workspaceTitle ?? "Playground"}
        </span>
      )}
      <span className="h-3.5 w-px bg-white/10" />
      <span className="tabular-nums text-white/45">
        {Math.round(scale * 100)}%
      </span>
      <button
        type="button"
        onClick={reset}
        title="Reset viewport"
        className="rounded-lg px-2 py-1 text-white/55 transition-colors hover:bg-white/[0.06] hover:text-white"
      >
        Reset
      </button>
    </div>
  );
}

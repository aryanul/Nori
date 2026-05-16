"use client";

import Image from "next/image";
import { useCanvasStore } from "@/store/canvas-store";

type Props = { workspaceTitle?: string };

export function Toolbar({ workspaceTitle }: Props) {
  const scale = useCanvasStore((s) => s.viewport.scale);
  const reset = useCanvasStore((s) => s.resetViewport);

  return (
    <div className="pointer-events-auto flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/70 backdrop-blur-xl">
      <Image
        src="/nori-logo.png"
        alt="Nori"
        width={22}
        height={22}
        className="rounded-md"
      />
      <span className="text-white/30">·</span>
      <span className="max-w-[200px] truncate text-white/60">
        {workspaceTitle ?? "Playground"}
      </span>
      <span className="text-white/30">·</span>
      <span className="tabular-nums">{Math.round(scale * 100)}%</span>
      <button
        type="button"
        onClick={reset}
        className="ml-1 rounded-lg border border-white/10 px-2 py-1 text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white"
      >
        Reset view
      </button>
    </div>
  );
}

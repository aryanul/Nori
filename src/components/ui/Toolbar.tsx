"use client";

import { useEffect, useTransition } from "react";
import { useCanvasStore } from "@/store/canvas-store";
import { saveWorkspace } from "@/lib/actions/workspace";
import { cn } from "@/lib/cn";

type Props = { workspaceTitle?: string };

export function Toolbar({ workspaceTitle }: Props) {
  const scale = useCanvasStore((s) => s.viewport.scale);
  const reset = useCanvasStore((s) => s.resetViewport);
  const workspaceId = useCanvasStore((s) => s.workspaceId);
  const saveStatus = useCanvasStore((s) => s.saveStatus);
  const isDirty = useCanvasStore((s) => s.version !== s.savedVersion);
  const setSaveStatus = useCanvasStore((s) => s.setSaveStatus);
  const markSaved = useCanvasStore((s) => s.markSaved);
  const getSnapshot = useCanvasStore((s) => s.getSnapshot);

  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (saveStatus !== "saved") return;
    const t = window.setTimeout(() => setSaveStatus("idle"), 1800);
    return () => window.clearTimeout(t);
  }, [saveStatus, setSaveStatus]);

  const onSave = () => {
    if (!workspaceId) return;
    const { nodes, connections, version } = getSnapshot();
    setSaveStatus("saving");
    startTransition(async () => {
      try {
        await saveWorkspace(workspaceId, nodes, connections);
        markSaved(version);
      } catch (err) {
        console.error("Save failed", err);
        setSaveStatus("error");
      }
    });
  };

  const showButton =
    workspaceId !== null &&
    (isDirty || saveStatus === "saving" || saveStatus === "error");
  const showSavedBadge =
    workspaceId !== null && !isDirty && saveStatus === "saved";

  const saveLabel = (() => {
    if (saveStatus === "saving" || isPending) return "Saving…";
    if (saveStatus === "error") return "Retry save";
    return "Save";
  })();

  return (
    <div className="pointer-events-auto flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/70 backdrop-blur-xl">
      <span className="font-medium tracking-tight text-white/90">Nori</span>
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
      {showButton && (
        <button
          type="button"
          onClick={onSave}
          disabled={isPending || saveStatus === "saving"}
          className={cn(
            "rounded-lg border px-2 py-1 transition-colors",
            saveStatus === "error"
              ? "border-red-400/40 text-red-300 hover:bg-red-400/10"
              : "border-sky-400/40 text-sky-200 hover:bg-sky-400/10",
            (isPending || saveStatus === "saving") && "cursor-wait opacity-70",
          )}
        >
          {saveLabel}
        </button>
      )}
      {showSavedBadge && (
        <span className="rounded-lg border border-emerald-400/30 px-2 py-1 text-emerald-300/90">
          Saved
        </span>
      )}
    </div>
  );
}

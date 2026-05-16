"use client";

import { useEffect, useRef, useState } from "react";
import { useCanvasStore } from "@/store/canvas-store";
import type { CanvasNode } from "@/types/canvas";
import { cn } from "@/lib/cn";

type Props = { node: CanvasNode };

const isEditable = (el: EventTarget | null) => {
  if (!el || !(el instanceof HTMLElement)) return false;
  return el.tagName === "INPUT" || el.tagName === "TEXTAREA";
};

export function NodeCard({ node }: Props) {
  const moveNode = useCanvasStore((s) => s.moveNode);
  const updateNodeContent = useCanvasStore((s) => s.updateNodeContent);
  const select = useCanvasStore((s) => s.select);
  const viewport = useCanvasStore((s) => s.viewport);
  const isSelected = useCanvasStore(
    (s) => s.selection?.type === "node" && s.selection.id === node.id,
  );
  const startPendingConnection = useCanvasStore(
    (s) => s.startPendingConnection,
  );
  const updatePendingConnection = useCanvasStore(
    (s) => s.updatePendingConnection,
  );
  const endPendingConnection = useCanvasStore((s) => s.endPendingConnection);

  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef<{ dx: number; dy: number } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const viewportRef = useRef(viewport);
  useEffect(() => {
    viewportRef.current = viewport;
  }, [viewport]);

  const screenToWorld = (clientX: number, clientY: number) => {
    const vp = viewportRef.current;
    return { wx: (clientX - vp.x) / vp.scale, wy: (clientY - vp.y) / vp.scale };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    select({ type: "node", id: node.id });
    if (isEditable(e.target)) return; // editing → don't start drag
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    const { wx, wy } = screenToWorld(e.clientX, e.clientY);
    dragOffset.current = { dx: wx - node.x, dy: wy - node.y };
    setDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragOffset.current) return;
    const { wx, wy } = screenToWorld(e.clientX, e.clientY);
    moveNode(node.id, wx - dragOffset.current.dx, wy - dragOffset.current.dy);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (cardRef.current?.hasPointerCapture(e.pointerId)) {
      (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
    }
    dragOffset.current = null;
    setDragging(false);
  };

  const onHandlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.preventDefault();
    const { wx, wy } = screenToWorld(e.clientX, e.clientY);
    startPendingConnection(node.id, wx, wy);

    const onMove = (ev: PointerEvent) => {
      const { wx: mx, wy: my } = screenToWorld(ev.clientX, ev.clientY);
      updatePendingConnection(mx, my);
    };

    const onUp = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      const el = document.elementFromPoint(
        ev.clientX,
        ev.clientY,
      ) as HTMLElement | null;
      const targetId =
        el?.closest<HTMLElement>("[data-node-id]")?.dataset.nodeId ?? null;
      endPendingConnection(targetId);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const isSticky = node.kind === "sticky";

  return (
    <div
      ref={cardRef}
      data-node-id={node.id}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className={cn(
        "group pointer-events-auto absolute select-none rounded-2xl border backdrop-blur-md transition-shadow",
        "border-white/10 bg-white/[0.04] text-white shadow-[0_8px_30px_rgba(0,0,0,0.35)]",
        dragging
          ? "cursor-grabbing shadow-[0_18px_45px_rgba(0,0,0,0.55)]"
          : "cursor-grab hover:bg-white/[0.06]",
        isSticky && "border-yellow-300/30 bg-yellow-300/10",
        isSelected && "ring-1 ring-sky-400/70 ring-offset-0",
      )}
      style={{
        left: node.x,
        top: node.y,
        width: node.width,
        height: node.height,
      }}
    >
      <div className="flex h-full flex-col gap-2 p-4">
        <input
          value={node.title ?? ""}
          onChange={(e) =>
            updateNodeContent(node.id, { title: e.target.value })
          }
          placeholder="Untitled"
          spellCheck={false}
          className="w-full cursor-text select-text border-none bg-transparent text-sm font-semibold tracking-tight text-white/90 outline-none placeholder:text-white/30"
        />
        <textarea
          value={node.body ?? ""}
          onChange={(e) =>
            updateNodeContent(node.id, { body: e.target.value })
          }
          placeholder="Add a note…"
          spellCheck={false}
          className="w-full flex-1 cursor-text select-text resize-none border-none bg-transparent text-xs leading-relaxed text-white/60 outline-none placeholder:text-white/25"
        />
      </div>

      <div
        onPointerDown={onHandlePointerDown}
        title="Drag to connect"
        className={cn(
          "absolute top-1/2 -right-2 size-4 -translate-y-1/2 rounded-full border border-white/30 bg-sky-400/70",
          "opacity-0 transition-opacity group-hover:opacity-100",
          isSelected && "opacity-100",
          "cursor-crosshair shadow-[0_0_10px_rgba(125,211,252,0.55)]",
        )}
      />
    </div>
  );
}

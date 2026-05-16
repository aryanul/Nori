"use client";

import { useEffect, useRef, useState } from "react";
import { useCanvasStore } from "@/store/canvas-store";
import { CanvasGrid } from "./CanvasGrid";
import { NodeCard } from "./NodeCard";
import { ConnectionsLayer } from "./ConnectionsLayer";

export function InfiniteCanvas() {
  const viewport = useCanvasStore((s) => s.viewport);
  const panBy = useCanvasStore((s) => s.panBy);
  const zoomAt = useCanvasStore((s) => s.zoomAt);
  const nodes = useCanvasStore((s) => s.nodes);
  const createNode = useCanvasStore((s) => s.createNode);
  const clearSelection = useCanvasStore((s) => s.clearSelection);
  const selection = useCanvasStore((s) => s.selection);
  const removeNode = useCanvasStore((s) => s.removeNode);
  const removeConnection = useCanvasStore((s) => s.removeConnection);

  const containerRef = useRef<HTMLDivElement>(null);
  const panning = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const [isPanning, setIsPanning] = useState(false);

  const screenToWorld = (clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    const localX = clientX - (rect?.left ?? 0);
    const localY = clientY - (rect?.top ?? 0);
    return {
      wx: (localX - viewport.x) / viewport.scale,
      wy: (localY - viewport.y) / viewport.scale,
    };
  };

  const dropTextSelection = () => {
    if (typeof window === "undefined") return;
    const active = document.activeElement;
    if (active instanceof HTMLElement && active !== document.body) {
      active.blur();
    }
    window.getSelection()?.removeAllRanges();
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    dropTextSelection();
    clearSelection();
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    panning.current = true;
    lastPoint.current = { x: e.clientX, y: e.clientY };
    setIsPanning(true);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!panning.current || !lastPoint.current) return;
    const dx = e.clientX - lastPoint.current.x;
    const dy = e.clientY - lastPoint.current.y;
    lastPoint.current = { x: e.clientX, y: e.clientY };
    panBy(dx, dy);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
    panning.current = false;
    lastPoint.current = null;
    setIsPanning(false);
  };

  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const factor = Math.exp(-e.deltaY * 0.0015);
    zoomAt(factor, e.clientX - rect.left, e.clientY - rect.top);
  };

  const onDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    e.preventDefault();
    dropTextSelection();
    const { wx, wy } = screenToWorld(e.clientX, e.clientY);
    createNode(wx, wy, "card");
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      if (!selection) return;
      e.preventDefault();
      if (selection.type === "node") removeNode(selection.id);
      else removeConnection(selection.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selection, removeNode, removeConnection]);

  return (
    <div
      ref={containerRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onWheel={onWheel}
      onDoubleClick={onDoubleClick}
      className="relative h-full w-full select-none overflow-hidden bg-[#07080c] touch-none"
      style={{ cursor: isPanning ? "grabbing" : "grab" }}
    >
      <CanvasGrid />

      <div
        className="pointer-events-none absolute inset-0 origin-top-left"
        style={{
          transform: `translate3d(${viewport.x}px, ${viewport.y}px, 0) scale(${viewport.scale})`,
          transformOrigin: "0 0",
          willChange: "transform",
        }}
      >
        <ConnectionsLayer />
        {Object.values(nodes).map((node) => (
          <NodeCard key={node.id} node={node} />
        ))}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef } from "react";
import { useCanvasStore } from "@/store/canvas-store";
import type { CanvasNode } from "@/types/canvas";

const MIN_W = 100;
const MIN_H = 60;
const HANDLE_SIZE = 10;

type Corner = "nw" | "ne" | "sw" | "se";

const CORNER_CURSOR: Record<Corner, string> = {
  nw: "nwse-resize",
  ne: "nesw-resize",
  sw: "nesw-resize",
  se: "nwse-resize",
};

/**
 * Resize handles rendered on the single currently-selected node. Sits inside
 * the world-transform wrapper so the handles pan/zoom with the canvas.
 */
export function ResizeHandles() {
  const selectedIds = useCanvasStore((s) => s.selectedNodeIds);
  const nodes = useCanvasStore((s) => s.nodes);
  const patchNode = useCanvasStore((s) => s.patchNode);
  const viewport = useCanvasStore((s) => s.viewport);
  const readOnly = useCanvasStore((s) => s.readOnly);

  const viewportRef = useRef(viewport);
  useEffect(() => {
    viewportRef.current = viewport;
  }, [viewport]);

  if (readOnly) return null;
  if (selectedIds.length !== 1) return null;
  const node = nodes[selectedIds[0]];
  if (!node) return null;
  // Don't show resize on the in-progress empty image/link placeholders —
  // the inner UI needs the room to lay out cleanly.
  if (node.kind === "image" && !node.src) return null;
  if (node.kind === "link" && !node.url) return null;

  const startResize = (corner: Corner, e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.preventDefault();
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    const start = {
      x: node.x,
      y: node.y,
      width: node.width,
      height: node.height,
      pointerX: e.clientX,
      pointerY: e.clientY,
    };

    const onMove = (ev: PointerEvent) => {
      const vp = viewportRef.current;
      const dx = (ev.clientX - start.pointerX) / vp.scale;
      const dy = (ev.clientY - start.pointerY) / vp.scale;

      let nextX = start.x;
      let nextY = start.y;
      let nextW = start.width;
      let nextH = start.height;

      if (corner === "se") {
        nextW = Math.max(MIN_W, start.width + dx);
        nextH = Math.max(MIN_H, start.height + dy);
      } else if (corner === "sw") {
        const clampedW = Math.max(MIN_W, start.width - dx);
        nextX = start.x + (start.width - clampedW);
        nextW = clampedW;
        nextH = Math.max(MIN_H, start.height + dy);
      } else if (corner === "ne") {
        nextW = Math.max(MIN_W, start.width + dx);
        const clampedH = Math.max(MIN_H, start.height - dy);
        nextY = start.y + (start.height - clampedH);
        nextH = clampedH;
      } else {
        // nw
        const clampedW = Math.max(MIN_W, start.width - dx);
        nextX = start.x + (start.width - clampedW);
        nextW = clampedW;
        const clampedH = Math.max(MIN_H, start.height - dy);
        nextY = start.y + (start.height - clampedH);
        nextH = clampedH;
      }

      patchNode(node.id, {
        x: nextX,
        y: nextY,
        width: nextW,
        height: nextH,
      });
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  // Corner positions (centered on the node's corners, slightly outside the
  // border for clear hit targets).
  const corners: Array<{ id: Corner; left: number; top: number }> = [
    { id: "nw", left: node.x - HANDLE_SIZE / 2, top: node.y - HANDLE_SIZE / 2 },
    {
      id: "ne",
      left: node.x + node.width - HANDLE_SIZE / 2,
      top: node.y - HANDLE_SIZE / 2,
    },
    {
      id: "sw",
      left: node.x - HANDLE_SIZE / 2,
      top: node.y + node.height - HANDLE_SIZE / 2,
    },
    {
      id: "se",
      left: node.x + node.width - HANDLE_SIZE / 2,
      top: node.y + node.height - HANDLE_SIZE / 2,
    },
  ];

  return (
    <>
      {corners.map((c) => (
        <div
          key={c.id}
          data-export-skip
          onPointerDown={(e) => startResize(c.id, e)}
          className="pointer-events-auto absolute rounded-sm border border-white/40 bg-[#7ad7ff] shadow-[0_0_10px_rgba(122,215,255,0.55)]"
          style={{
            left: c.left,
            top: c.top,
            width: HANDLE_SIZE,
            height: HANDLE_SIZE,
            cursor: CORNER_CURSOR[c.id],
          }}
        />
      ))}
    </>
  );
}

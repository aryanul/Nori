"use client";

import { useCanvasStore } from "@/store/canvas-store";

export function SelectionRectOverlay() {
  const rect = useCanvasStore((s) => s.selectionRect);
  if (!rect) return null;
  const x = Math.min(rect.startX, rect.endX);
  const y = Math.min(rect.startY, rect.endY);
  const width = Math.abs(rect.endX - rect.startX);
  const height = Math.abs(rect.endY - rect.startY);
  return (
    <div
      aria-hidden
      data-export-skip
      className="pointer-events-none absolute rounded-sm border border-[#7ad7ff]/70 bg-[#7ad7ff]/[0.07]"
      style={{ left: x, top: y, width, height }}
    />
  );
}

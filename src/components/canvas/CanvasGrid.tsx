"use client";

import { useCanvasStore } from "@/store/canvas-store";

const BASE_DOT_SIZE = 1.6;
const BASE_SPACING = 32;

export function CanvasGrid() {
  const viewport = useCanvasStore((s) => s.viewport);
  const spacing = BASE_SPACING * viewport.scale;
  const dot = BASE_DOT_SIZE * Math.max(0.5, Math.min(1.4, viewport.scale));

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={{
        backgroundImage: `radial-gradient(circle, var(--grid-dot) ${dot}px, transparent ${dot}px)`,
        backgroundSize: `${spacing}px ${spacing}px`,
        backgroundPosition: `${viewport.x}px ${viewport.y}px`,
      }}
    />
  );
}

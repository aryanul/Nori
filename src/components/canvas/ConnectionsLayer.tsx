"use client";

import { useCanvasStore, nodeCenter } from "@/store/canvas-store";

const WORLD = 100_000;

function bezierPath(x1: number, y1: number, x2: number, y2: number) {
  const dx = Math.abs(x2 - x1);
  const c = Math.max(40, dx * 0.5);
  return `M ${x1} ${y1} C ${x1 + c} ${y1}, ${x2 - c} ${y2}, ${x2} ${y2}`;
}

export function ConnectionsLayer() {
  const nodes = useCanvasStore((s) => s.nodes);
  const connections = useCanvasStore((s) => s.connections);
  const pending = useCanvasStore((s) => s.pendingConnection);
  const selectedConnectionId = useCanvasStore((s) => s.selectedConnectionId);
  const selectConnection = useCanvasStore((s) => s.selectConnection);

  return (
    <svg
      className="pointer-events-none absolute"
      style={{ left: -WORLD / 2, top: -WORLD / 2, width: WORLD, height: WORLD, overflow: "visible" }}
      viewBox={`${-WORLD / 2} ${-WORLD / 2} ${WORLD} ${WORLD}`}
    >
      <defs>
        <marker
          id="nori-arrow"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(255,255,255,0.65)" />
        </marker>
        <marker
          id="nori-arrow-pending"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(125, 211, 252, 0.9)" />
        </marker>
      </defs>

      {Object.values(connections).map((c) => {
        const from = nodes[c.fromNodeId];
        const to = nodes[c.toNodeId];
        if (!from || !to) return null;
        const a = nodeCenter(from);
        const b = nodeCenter(to);
        const isSelected = selectedConnectionId === c.id;
        const d = bezierPath(a.x, a.y, b.x, b.y);
        return (
          <g key={c.id} className="pointer-events-auto cursor-pointer">
            <path
              d={d}
              fill="none"
              stroke="transparent"
              strokeWidth={16}
              onPointerDown={(e) => {
                e.stopPropagation();
                selectConnection(c.id);
              }}
            />
            <path
              d={d}
              fill="none"
              stroke={
                isSelected ? "rgba(122, 215, 255, 0.95)" : "rgba(255,255,255,0.45)"
              }
              strokeWidth={isSelected ? 2.5 : 1.5}
              markerEnd="url(#nori-arrow)"
            />
          </g>
        );
      })}

      {pending && nodes[pending.fromNodeId] && (() => {
        const from = nodeCenter(nodes[pending.fromNodeId]);
        const d = bezierPath(from.x, from.y, pending.toX, pending.toY);
        return (
          <path
            d={d}
            fill="none"
            stroke="rgba(125, 211, 252, 0.9)"
            strokeWidth={1.8}
            strokeDasharray="6 5"
            markerEnd="url(#nori-arrow-pending)"
          />
        );
      })()}
    </svg>
  );
}

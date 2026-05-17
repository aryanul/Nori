"use client";

import { useCanvasStore, nodeCenter } from "@/store/canvas-store";
import type { CanvasNode } from "@/types/canvas";

const WORLD = 100_000;

type Side = "top" | "bottom" | "left" | "right";

function hitSide(target: CanvasNode, point: { x: number; y: number }): Side {
  const eps = 0.01;
  if (Math.abs(point.y - target.y) < eps) return "top";
  if (Math.abs(point.y - (target.y + target.height)) < eps) return "bottom";
  if (Math.abs(point.x - target.x) < eps) return "left";
  return "right";
}

/**
 * Build a cubic bezier from source center `a` to destination border point `b`.
 *
 * Control points are picked so:
 *   - The curve leaves the source heading roughly toward the destination
 *     (tangent = unit vector from source to dest).
 *   - The curve arrives at the destination *perpendicular to the border it
 *     hits* — so a line approaching from above terminates on the top edge
 *     with a downward tangent, and the arrowhead points down.
 *
 * Old behavior used horizontal control offsets unconditionally, which made
 * the arrow point sideways for vertical connections.
 */
function buildCurve(
  a: { x: number; y: number },
  b: { x: number; y: number },
  target: CanvasNode,
): string {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len < 0.5) return `M ${a.x} ${a.y} L ${b.x} ${b.y}`;

  // Curve "tension" — bigger = longer, lazier curve. Bounded so short
  // connections don't get weirdly curly.
  const mag = Math.max(40, Math.min(180, len * 0.35));

  // Source: tangent points in the direction of travel.
  const ux = dx / len;
  const uy = dy / len;
  const c1x = a.x + ux * mag;
  const c1y = a.y + uy * mag;

  // Destination: tangent perpendicular to the hit border, pulling outward.
  let c2x = b.x;
  let c2y = b.y;
  switch (hitSide(target, b)) {
    case "top":
      c2y = b.y - mag;
      break;
    case "bottom":
      c2y = b.y + mag;
      break;
    case "left":
      c2x = b.x - mag;
      break;
    case "right":
      c2x = b.x + mag;
      break;
  }

  return `M ${a.x} ${a.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${b.x} ${b.y}`;
}

/**
 * Walk the line from `(fromX, fromY)` toward the center of `target`, find the
 * first point where the line crosses the rectangle's perimeter, and return
 * that point. Used so the connection arrow lands on the target's border
 * instead of poking through to its center.
 */
function intersectRectBorder(
  target: CanvasNode,
  fromX: number,
  fromY: number,
): { x: number; y: number } {
  const cx = target.x + target.width / 2;
  const cy = target.y + target.height / 2;
  const dx = cx - fromX;
  const dy = cy - fromY;

  if (dx === 0 && dy === 0) return { x: cx, y: cy };

  const candidates: Array<{ t: number; x: number; y: number }> = [];

  // Parameterize the line: P(t) = from + t * (center - from), t∈(0,1].
  // For each of the rectangle's four edges, solve for t and keep
  // intersections that lie within the edge's span.
  const minX = target.x;
  const maxX = target.x + target.width;
  const minY = target.y;
  const maxY = target.y + target.height;

  if (dx !== 0) {
    const tLeft = (minX - fromX) / dx;
    const yLeft = fromY + tLeft * dy;
    if (tLeft > 0 && tLeft <= 1 && yLeft >= minY && yLeft <= maxY) {
      candidates.push({ t: tLeft, x: minX, y: yLeft });
    }
    const tRight = (maxX - fromX) / dx;
    const yRight = fromY + tRight * dy;
    if (tRight > 0 && tRight <= 1 && yRight >= minY && yRight <= maxY) {
      candidates.push({ t: tRight, x: maxX, y: yRight });
    }
  }
  if (dy !== 0) {
    const tTop = (minY - fromY) / dy;
    const xTop = fromX + tTop * dx;
    if (tTop > 0 && tTop <= 1 && xTop >= minX && xTop <= maxX) {
      candidates.push({ t: tTop, x: xTop, y: minY });
    }
    const tBottom = (maxY - fromY) / dy;
    const xBottom = fromX + tBottom * dx;
    if (tBottom > 0 && tBottom <= 1 && xBottom >= minX && xBottom <= maxX) {
      candidates.push({ t: tBottom, x: xBottom, y: maxY });
    }
  }

  if (candidates.length === 0) return { x: cx, y: cy };
  candidates.sort((a, b) => a.t - b.t);
  return { x: candidates[0].x, y: candidates[0].y };
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
      style={{
        left: -WORLD / 2,
        top: -WORLD / 2,
        width: WORLD,
        height: WORLD,
        overflow: "visible",
      }}
      viewBox={`${-WORLD / 2} ${-WORLD / 2} ${WORLD} ${WORLD}`}
      shapeRendering="geometricPrecision"
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
          <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(255,255,255,0.85)" />
        </marker>
        <marker
          id="nori-arrow-selected"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(122, 215, 255, 0.98)" />
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
        // Origin stays at source center; endpoint snaps to the destination's
        // border so the arrowhead lands on the edge instead of poking
        // through to the middle.
        const b = intersectRectBorder(to, a.x, a.y);
        const isSelected = selectedConnectionId === c.id;
        const d = buildCurve(a, b, to);
        return (
          <g
            key={c.id}
            data-connection-id={c.id}
            data-from-id={c.fromNodeId}
            data-to-id={c.toNodeId}
            className="pointer-events-auto cursor-pointer"
          >
            {/* Wide invisible hit-target for clicks. Non-scaling so it stays
                clickable at any zoom level. */}
            <path
              d={d}
              fill="none"
              stroke="transparent"
              strokeWidth={16}
              vectorEffect="non-scaling-stroke"
              onPointerDown={(e) => {
                e.stopPropagation();
                selectConnection(c.id);
              }}
            />
            {/* Visible stroke. `non-scaling-stroke` keeps it at exact device
                pixel width regardless of the parent transform's scale — the
                old behaviour was sub-pixel aliasing on zoom-out, which read
                as a blurry glow especially over busy frame surfaces. */}
            <path
              d={d}
              fill="none"
              stroke={
                isSelected
                  ? "rgba(122, 215, 255, 0.98)"
                  : "rgba(255, 255, 255, 0.72)"
              }
              strokeWidth={isSelected ? 2.5 : 1.6}
              vectorEffect="non-scaling-stroke"
              strokeLinecap="round"
              markerEnd={
                isSelected ? "url(#nori-arrow-selected)" : "url(#nori-arrow)"
              }
            />
          </g>
        );
      })}

      {pending &&
        nodes[pending.fromNodeId] &&
        (() => {
          const from = nodeCenter(nodes[pending.fromNodeId]);
          // Pending line has no real target node, just a cursor point.
          // Use a light tension along the direction of travel.
          const dx = pending.toX - from.x;
          const dy = pending.toY - from.y;
          const len = Math.hypot(dx, dy);
          const mag = len > 0.5 ? Math.max(40, Math.min(180, len * 0.35)) : 0;
          const ux = len > 0 ? dx / len : 0;
          const uy = len > 0 ? dy / len : 0;
          const c1x = from.x + ux * mag;
          const c1y = from.y + uy * mag;
          const c2x = pending.toX - ux * mag;
          const c2y = pending.toY - uy * mag;
          const d = `M ${from.x} ${from.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${pending.toX} ${pending.toY}`;
          return (
            <path
              d={d}
              fill="none"
              stroke="rgba(125, 211, 252, 0.95)"
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
              strokeDasharray="6 5"
              strokeLinecap="round"
              markerEnd="url(#nori-arrow-pending)"
            />
          );
        })()}
    </svg>
  );
}

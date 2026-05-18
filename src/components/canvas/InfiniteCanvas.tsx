"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useCanvasStore } from "@/store/canvas-store";
import { CanvasGrid } from "./CanvasGrid";
import { NodeCard } from "./NodeCard";
import { ConnectionsLayer } from "./ConnectionsLayer";
import { SelectionRectOverlay } from "./SelectionRectOverlay";
import { NodeInspector } from "./NodeInspector";
import { ResizeHandles } from "./ResizeHandles";
import { ThreadBadges } from "./ThreadBadges";
import { ThreadPanel } from "./ThreadPanel";
import type { PeerState, UserIdentity } from "@/types/realtime";
import { RemoteCursors } from "./RemoteCursors";

type Props = {
  onCursorMove?: (worldX: number, worldY: number) => void;
  peers?: PeerState[];
  self?: UserIdentity | null;
  worldRef?: React.RefObject<HTMLDivElement | null>;
};

type DragMode = null | "pan" | "rect" | "draw" | "pinch";

const DRAW_STROKE_COLOR = "#7ad7ff";
const DRAW_STROKE_WIDTH = 3;

// Build a smoothed SVG path from a flat [x0,y0,x1,y1,...] points array.
// Uses midpoint quadratic curves — each anchor sits between two raw points,
// producing a soft, freehand-looking stroke without a library.
export function buildSmoothPath(points: number[]): string {
  const len = points.length;
  if (len < 2) return "";
  if (len === 2) return `M ${points[0]} ${points[1]}`;
  let d = `M ${points[0]} ${points[1]}`;
  if (len === 4) return `${d} L ${points[2]} ${points[3]}`;
  for (let i = 2; i < len - 2; i += 2) {
    const mx = (points[i] + points[i + 2]) / 2;
    const my = (points[i + 1] + points[i + 3]) / 2;
    d += ` Q ${points[i]} ${points[i + 1]}, ${mx} ${my}`;
  }
  d += ` L ${points[len - 2]} ${points[len - 1]}`;
  return d;
}

export function InfiniteCanvas({
  onCursorMove,
  peers = [],
  self = null,
  worldRef: externalWorldRef,
}: Props) {
  const viewport = useCanvasStore((s) => s.viewport);
  const panBy = useCanvasStore((s) => s.panBy);
  const zoomAt = useCanvasStore((s) => s.zoomAt);
  const nodes = useCanvasStore((s) => s.nodes);
  const activeTool = useCanvasStore((s) => s.activeTool);
  const setActiveTool = useCanvasStore((s) => s.setActiveTool);
  const createNode = useCanvasStore((s) => s.createNode);
  const createDrawingNode = useCanvasStore((s) => s.createDrawingNode);
  const clearSelection = useCanvasStore((s) => s.clearSelection);
  const selectedNodeIds = useCanvasStore((s) => s.selectedNodeIds);
  const selectedConnectionId = useCanvasStore((s) => s.selectedConnectionId);
  const removeNodes = useCanvasStore((s) => s.removeNodes);
  const removeConnection = useCanvasStore((s) => s.removeConnection);
  const setSelectionRect = useCanvasStore((s) => s.setSelectionRect);
  const commitSelectionRect = useCanvasStore((s) => s.commitSelectionRect);
  const readOnly = useCanvasStore((s) => s.readOnly);
  const openContextMenu = useCanvasStore((s) => s.openContextMenu);
  const closeContextMenu = useCanvasStore((s) => s.closeContextMenu);

  const containerRef = useRef<HTMLDivElement>(null);
  const dragMode = useRef<DragMode>(null);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const rectStart = useRef<{ wx: number; wy: number; additive: boolean } | null>(
    null,
  );
  // Multi-pointer tracking — keyed by pointerId. We watch for the second
  // pointer landing on the canvas to enter pinch mode for touch zoom + pan.
  const activePointers = useRef<Map<number, { clientX: number; clientY: number }>>(
    new Map(),
  );
  const pinchState = useRef<{
    startDist: number;
    startMid: { x: number; y: number };
    lastMid: { x: number; y: number };
    lastScaleFactor: number;
  } | null>(null);
  // In-progress freehand stroke. Buffered in world coords; rendered as an
  // overlay path until pointerup commits it as a drawing node.
  const drawPoints = useRef<number[]>([]);
  const [drawPath, setDrawPath] = useState<string>("");
  // Latest cursor position in world coords — used by the clipboard paste
  // handler so a pasted image lands where the cursor is hovering.
  const lastMouseWorld = useRef<{ wx: number; wy: number }>({ wx: 0, wy: 0 });
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

  const enterPinchMode = () => {
    const pts = Array.from(activePointers.current.values());
    if (pts.length < 2) return;
    const [a, b] = pts;
    const dx = b.clientX - a.clientX;
    const dy = b.clientY - a.clientY;
    const dist = Math.hypot(dx, dy) || 1;
    const mid = {
      x: (a.clientX + b.clientX) / 2,
      y: (a.clientY + b.clientY) / 2,
    };
    pinchState.current = {
      startDist: dist,
      startMid: mid,
      lastMid: mid,
      lastScaleFactor: 1,
    };
    dragMode.current = "pinch";
    // Cancel any in-flight gesture from the first pointer.
    setSelectionRect(null);
    rectStart.current = null;
    lastPoint.current = null;
    setIsPanning(false);
    drawPoints.current = [];
    setDrawPath("");
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;

    // Track every active pointer on the canvas so we can detect pinch.
    activePointers.current.set(e.pointerId, {
      clientX: e.clientX,
      clientY: e.clientY,
    });
    if (activePointers.current.size >= 2) {
      enterPinchMode();
      return;
    }

    dropTextSelection();
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);

    // Tool-specific behavior when clicking empty canvas:
    //   - draw: start freehand capture.
    //   - card / sticky / frame / image / link: create that node here.
    //   - select + shift: start a rectangle select.
    //   - select (no modifier): pan.
    if (activeTool === "draw" && !readOnly) {
      const { wx, wy } = screenToWorld(e.clientX, e.clientY);
      drawPoints.current = [wx, wy];
      setDrawPath(buildSmoothPath(drawPoints.current));
      dragMode.current = "draw";
      return;
    }

    if (activeTool !== "select" && activeTool !== "draw" && !readOnly) {
      const { wx, wy } = screenToWorld(e.clientX, e.clientY);
      createNode(wx, wy, activeTool);
      setActiveTool("select");
      return;
    }

    if (e.shiftKey) {
      const { wx, wy } = screenToWorld(e.clientX, e.clientY);
      rectStart.current = { wx, wy, additive: false };
      setSelectionRect({ startX: wx, startY: wy, endX: wx, endY: wy });
      dragMode.current = "rect";
      return;
    }

    clearSelection();
    dragMode.current = "pan";
    lastPoint.current = { x: e.clientX, y: e.clientY };
    setIsPanning(true);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointers.current.has(e.pointerId)) {
      activePointers.current.set(e.pointerId, {
        clientX: e.clientX,
        clientY: e.clientY,
      });
    }
    const wp = screenToWorld(e.clientX, e.clientY);
    lastMouseWorld.current = wp;
    if (onCursorMove) {
      onCursorMove(wp.wx, wp.wy);
    }

    if (dragMode.current === "pinch" && pinchState.current) {
      const pts = Array.from(activePointers.current.values());
      if (pts.length < 2) return;
      const [a, b] = pts;
      const dx = b.clientX - a.clientX;
      const dy = b.clientY - a.clientY;
      const dist = Math.hypot(dx, dy) || 1;
      const mid = {
        x: (a.clientX + b.clientX) / 2,
        y: (a.clientY + b.clientY) / 2,
      };
      const targetFactor = dist / pinchState.current.startDist;
      const stepFactor = targetFactor / pinchState.current.lastScaleFactor;
      pinchState.current.lastScaleFactor = targetFactor;
      // Zoom around the midpoint (in container-local coords).
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        zoomAt(stepFactor, mid.x - rect.left, mid.y - rect.top);
      }
      const panDx = mid.x - pinchState.current.lastMid.x;
      const panDy = mid.y - pinchState.current.lastMid.y;
      pinchState.current.lastMid = mid;
      if (panDx !== 0 || panDy !== 0) panBy(panDx, panDy);
      return;
    }

    if (dragMode.current === "pan" && lastPoint.current) {
      const dx = e.clientX - lastPoint.current.x;
      const dy = e.clientY - lastPoint.current.y;
      lastPoint.current = { x: e.clientX, y: e.clientY };
      panBy(dx, dy);
    } else if (dragMode.current === "rect" && rectStart.current) {
      setSelectionRect({
        startX: rectStart.current.wx,
        startY: rectStart.current.wy,
        endX: wp.wx,
        endY: wp.wy,
      });
    } else if (dragMode.current === "draw") {
      const last = drawPoints.current;
      const lx = last[last.length - 2];
      const ly = last[last.length - 1];
      // Skip tiny moves so we don't bloat the points array.
      if (Math.hypot(wp.wx - lx, wp.wy - ly) < 1.5 / viewport.scale) return;
      last.push(wp.wx, wp.wy);
      setDrawPath(buildSmoothPath(last));
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    try {
      (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    activePointers.current.delete(e.pointerId);
    if (dragMode.current === "pinch") {
      // Stay in pinch until both fingers leave; otherwise switching back to
      // single-touch mid-gesture is jarring.
      if (activePointers.current.size < 2) {
        pinchState.current = null;
        dragMode.current = null;
      }
      return;
    }
    if (dragMode.current === "rect" && rectStart.current) {
      commitSelectionRect(rectStart.current.additive);
    } else if (dragMode.current === "draw") {
      const pts = drawPoints.current;
      if (pts.length >= 4) {
        createDrawingNode(pts, DRAW_STROKE_COLOR, DRAW_STROKE_WIDTH);
      }
      drawPoints.current = [];
      setDrawPath("");
      setActiveTool("select");
    }
    dragMode.current = null;
    lastPoint.current = null;
    rectStart.current = null;
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
    if (readOnly) return;
    e.preventDefault();
    dropTextSelection();
    const { wx, wy } = screenToWorld(e.clientX, e.clientY);
    // Double-click always creates whatever the active tool is, defaulting
    // to a card if we're in select or draw mode (no double-click stroke).
    const kind =
      activeTool === "select" || activeTool === "draw" ? "card" : activeTool;
    createNode(wx, wy, kind);
    if (activeTool !== "select") setActiveTool("select");
  };

  // Right-click on empty canvas → "Export workspace" menu. Right-click on a
  // node is handled by NodeCard so the menu can act on the selection.
  const onContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    e.preventDefault();
    openContextMenu(e.clientX, e.clientY, "canvas");
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      if (selectedNodeIds.length === 0 && !selectedConnectionId) return;
      e.preventDefault();
      if (selectedNodeIds.length > 0) {
        removeNodes(selectedNodeIds);
      }
      if (selectedConnectionId) {
        removeConnection(selectedConnectionId);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    selectedNodeIds,
    selectedConnectionId,
    removeNodes,
    removeConnection,
  ]);

  // Clipboard paste — if a clipboard contains an image, drop an image node
  // at the last mouse position. Skipped when the user is editing inside a
  // node so normal text paste still works.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (useCanvasStore.getState().readOnly) return;
      const tag = (document.activeElement as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (!file) continue;
          if (file.size > 4 * 1024 * 1024) {
            console.warn(
              `[paste] image too large (${(file.size / 1024 / 1024).toFixed(1)}MB) — max 4MB`,
            );
            return;
          }
          const reader = new FileReader();
          reader.onload = () => {
            if (typeof reader.result !== "string") return;
            const { wx, wy } = lastMouseWorld.current;
            const store = useCanvasStore.getState();
            const id = store.createNode(wx, wy, "image");
            store.patchNode(id, { src: reader.result });
          };
          reader.readAsDataURL(file);
          e.preventDefault();
          return;
        }
      }

      // No image found — check if it's a URL. If so, create a link node.
      const text = e.clipboardData?.getData("text/plain")?.trim();
      if (text && /^https?:\/\//i.test(text)) {
        const { wx, wy } = lastMouseWorld.current;
        const store = useCanvasStore.getState();
        const id = store.createNode(wx, wy, "link");
        store.patchNode(id, { url: text });
        e.preventDefault();
        // The LinkNodeContent's effect will fetch OG once it sees the url change.
        // We trigger that explicitly below for snappier UX.
        import("@/lib/actions/og").then(({ fetchOgPreview }) =>
          fetchOgPreview(text).then((res) => {
            if (res.ok) {
              useCanvasStore.getState().patchNode(id, {
                url: res.data.url,
                ogTitle: res.data.title ?? undefined,
                ogDescription: res.data.description ?? undefined,
                ogImage: res.data.image ?? undefined,
                ogSite: res.data.site ?? undefined,
              });
            }
          }),
        );
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  // Split nodes so frames render *behind* the connections layer and cards
  // render *above* it. Visual stack (bottom → top):
  //   1. Grid
  //   2. Frames        ← translucent regions; can't obscure connection lines
  //   3. Connections   ← clearly visible over frame surfaces now
  //   4. Cards         ← drawn on top so connections terminate cleanly at
  //                      card edges (most of the line is in clear space)
  //   5. Overlays      (selection rect, resize handles, inspector, cursors)
  const allNodes = Object.values(nodes);
  const frameNodes = allNodes.filter((n) => n.kind === "frame");
  const nonFrameNodes = allNodes.filter((n) => n.kind !== "frame");

  const cursorClass = readOnly
    ? isPanning
      ? "cursor-grabbing"
      : "cursor-grab"
    : activeTool === "draw"
      ? "cursor-crosshair"
      : activeTool !== "select"
        ? "cursor-crosshair"
        : isPanning
          ? "cursor-grabbing"
          : "cursor-grab";

  return (
    <div
      ref={containerRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onWheel={onWheel}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      className={`relative h-full w-full select-none overflow-hidden bg-[var(--bg)] touch-none ${cursorClass}`}
    >
      <CanvasGrid />

      {Object.keys(nodes).length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-85)] px-5 py-3 text-center text-xs text-[var(--ink-3)] backdrop-blur-md">
            <span className="font-medium text-[var(--ink-1)]">Double-click</span>{" "}
            anywhere to create a node ·{" "}
            <span className="font-medium text-[var(--ink-1)]">?</span> for shortcuts
          </div>
        </div>
      )}

      <div
        ref={externalWorldRef}
        data-world-wrapper
        className="pointer-events-none absolute inset-0 origin-top-left"
        style={{
          transform: `translate3d(${viewport.x}px, ${viewport.y}px, 0) scale(${viewport.scale})`,
          transformOrigin: "0 0",
          willChange: "transform",
        }}
      >
        {/* Frames first — they sit behind the connection layer */}
        <AnimatePresence>
          {frameNodes.map((node) => (
            <NodeCard key={node.id} node={node} />
          ))}
        </AnimatePresence>

        {/* Connections render OVER frame surfaces but UNDER cards */}
        <ConnectionsLayer />

        {/* Cards on top — terminate connections at card edges */}
        <AnimatePresence>
          {nonFrameNodes.map((node) => (
            <NodeCard key={node.id} node={node} />
          ))}
        </AnimatePresence>

        <SelectionRectOverlay />
        <ResizeHandles />
        <ThreadBadges />
        <NodeInspector />
        <ThreadPanel self={self} />
        <RemoteCursors peers={peers} />

        {/* In-progress freehand stroke. Renders inside the world wrapper so
            it scales with viewport. Pointer-events off so it never blocks
            the active gesture on the canvas underneath. */}
        {drawPath && (
          <svg
            className="pointer-events-none absolute"
            style={{
              left: -50000,
              top: -50000,
              width: 100000,
              height: 100000,
              overflow: "visible",
            }}
            viewBox="-50000 -50000 100000 100000"
          >
            <path
              d={drawPath}
              stroke={DRAW_STROKE_COLOR}
              strokeWidth={DRAW_STROKE_WIDTH}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>

      {/* View-only ambient indicator — a faint top edge strip so the viewport
          itself signals "you can't edit here", not just the toolbar badge. */}
      {readOnly && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[2px] bg-gradient-to-r from-transparent via-amber-400/45 to-transparent"
        />
      )}
    </div>
  );
}

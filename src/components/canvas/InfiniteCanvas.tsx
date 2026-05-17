"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useCanvasStore } from "@/store/canvas-store";
import { CanvasGrid } from "./CanvasGrid";
import { NodeCard } from "./NodeCard";
import { ConnectionsLayer } from "./ConnectionsLayer";
import { SelectionRectOverlay } from "./SelectionRectOverlay";
import { NodeInspector } from "./NodeInspector";
import type { PeerState } from "@/types/realtime";
import { RemoteCursors } from "./RemoteCursors";

type Props = {
  onCursorMove?: (worldX: number, worldY: number) => void;
  peers?: PeerState[];
};

type DragMode = null | "pan" | "rect";

export function InfiniteCanvas({ onCursorMove, peers = [] }: Props) {
  const viewport = useCanvasStore((s) => s.viewport);
  const panBy = useCanvasStore((s) => s.panBy);
  const zoomAt = useCanvasStore((s) => s.zoomAt);
  const nodes = useCanvasStore((s) => s.nodes);
  const activeTool = useCanvasStore((s) => s.activeTool);
  const setActiveTool = useCanvasStore((s) => s.setActiveTool);
  const createNode = useCanvasStore((s) => s.createNode);
  const clearSelection = useCanvasStore((s) => s.clearSelection);
  const selectedNodeIds = useCanvasStore((s) => s.selectedNodeIds);
  const selectedConnectionId = useCanvasStore((s) => s.selectedConnectionId);
  const removeNodes = useCanvasStore((s) => s.removeNodes);
  const removeConnection = useCanvasStore((s) => s.removeConnection);
  const setSelectionRect = useCanvasStore((s) => s.setSelectionRect);
  const commitSelectionRect = useCanvasStore((s) => s.commitSelectionRect);

  const containerRef = useRef<HTMLDivElement>(null);
  const dragMode = useRef<DragMode>(null);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const rectStart = useRef<{ wx: number; wy: number; additive: boolean } | null>(
    null,
  );
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

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    dropTextSelection();
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);

    // Tool-specific behavior when clicking empty canvas:
    //   - card / sticky / frame: create that node here, then switch back
    //     to select tool. (Single-shot creation; sticky-mode would need a
    //     keyboard modifier to stay.)
    //   - select + shift: start a rectangle select
    //   - select (no modifier): pan
    if (activeTool !== "select") {
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
    const wp = screenToWorld(e.clientX, e.clientY);
    lastMouseWorld.current = wp;
    if (onCursorMove) {
      onCursorMove(wp.wx, wp.wy);
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
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    try {
      (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    if (dragMode.current === "rect" && rectStart.current) {
      commitSelectionRect(rectStart.current.additive);
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
    e.preventDefault();
    dropTextSelection();
    const { wx, wy } = screenToWorld(e.clientX, e.clientY);
    // Double-click always creates whatever the active tool is, defaulting
    // to a card if we're in select mode.
    createNode(wx, wy, activeTool === "select" ? "card" : activeTool);
    if (activeTool !== "select") setActiveTool("select");
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

  // Render frames first so they sit behind cards in z-order.
  const sortedNodes = Object.values(nodes).sort((a, b) => {
    if (a.kind === "frame" && b.kind !== "frame") return -1;
    if (a.kind !== "frame" && b.kind === "frame") return 1;
    return 0;
  });

  const cursorClass =
    activeTool !== "select"
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
      className={`relative h-full w-full select-none overflow-hidden bg-[var(--bg)] touch-none ${cursorClass}`}
    >
      <CanvasGrid />

      {Object.keys(nodes).length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-3 text-center text-xs text-white/55 backdrop-blur-md">
            <span className="font-medium text-white/80">Double-click</span>{" "}
            anywhere to create a node ·{" "}
            <span className="font-medium text-white/80">?</span> for shortcuts
          </div>
        </div>
      )}

      <div
        className="pointer-events-none absolute inset-0 origin-top-left"
        style={{
          transform: `translate3d(${viewport.x}px, ${viewport.y}px, 0) scale(${viewport.scale})`,
          transformOrigin: "0 0",
          willChange: "transform",
        }}
      >
        <ConnectionsLayer />
        <AnimatePresence>
          {sortedNodes.map((node) => (
            <NodeCard key={node.id} node={node} />
          ))}
        </AnimatePresence>
        <SelectionRectOverlay />
        <NodeInspector />
        <RemoteCursors peers={peers} />
      </div>
    </div>
  );
}

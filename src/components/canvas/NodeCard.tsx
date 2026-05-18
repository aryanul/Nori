"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { motion } from "framer-motion";
import { useCanvasStore } from "@/store/canvas-store";
import type { CanvasNode } from "@/types/canvas";
import { fetchOgPreview } from "@/lib/actions/og";
import { cn } from "@/lib/cn";
import { buildSmoothPath } from "./InfiniteCanvas";

type Props = { node: CanvasNode };

const isEditable = (el: EventTarget | null) => {
  if (!el || !(el instanceof HTMLElement)) return false;
  return el.tagName === "INPUT" || el.tagName === "TEXTAREA";
};

function rectsOverlap(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
) {
  return !(
    a.x + a.width < b.x ||
    a.y + a.height < b.y ||
    a.x > b.x + b.width ||
    a.y > b.y + b.height
  );
}

export function NodeCard({ node }: Props) {
  const moveNodesBy = useCanvasStore((s) => s.moveNodesBy);
  const selectNodes = useCanvasStore((s) => s.selectNodes);
  const toggleNodeInSelection = useCanvasStore((s) => s.toggleNodeInSelection);
  const viewport = useCanvasStore((s) => s.viewport);
  const isSelected = useCanvasStore((s) =>
    s.selectedNodeIds.includes(node.id),
  );
  const startPendingConnection = useCanvasStore(
    (s) => s.startPendingConnection,
  );
  const updatePendingConnection = useCanvasStore(
    (s) => s.updatePendingConnection,
  );
  const endPendingConnection = useCanvasStore((s) => s.endPendingConnection);
  const readOnly = useCanvasStore((s) => s.readOnly);
  const openContextMenu = useCanvasStore((s) => s.openContextMenu);

  const [dragging, setDragging] = useState(false);
  const dragStateRef = useRef<{
    lastWx: number;
    lastWy: number;
    moveIds: string[];
  } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const viewportRef = useRef(viewport);
  useEffect(() => {
    viewportRef.current = viewport;
  }, [viewport]);

  const screenToWorld = (clientX: number, clientY: number) => {
    const vp = viewportRef.current;
    return {
      wx: (clientX - vp.x) / vp.scale,
      wy: (clientY - vp.y) / vp.scale,
    };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();

    if (e.shiftKey) {
      if (!isEditable(e.target)) toggleNodeInSelection(node.id);
      return;
    }

    const store = useCanvasStore.getState();
    const storeSelection = store.selectedNodeIds;
    let moveIds: string[];
    if (storeSelection.includes(node.id)) {
      moveIds = storeSelection;
    } else {
      moveIds = [node.id];
      selectNodes([node.id]);
    }

    // Frame group-drag: if this is a frame being dragged solo (or as a sole
    // selection), pick up every node that's spatially overlapping the frame
    // so the whole region moves together. Children aren't a persistent
    // parent-child relationship — just a snapshot at drag start.
    if (
      node.kind === "frame" &&
      (moveIds.length === 1 ||
        (moveIds.length === storeSelection.length &&
          storeSelection[0] === node.id))
    ) {
      const allNodes = store.nodes;
      const overlapping = Object.values(allNodes)
        .filter((n) => n.id !== node.id && rectsOverlap(n, node))
        .map((n) => n.id);
      if (overlapping.length > 0) {
        moveIds = [node.id, ...overlapping];
      }
    }

    if (isEditable(e.target)) return;
    // Viewers can select but never drag.
    if (readOnly) return;
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    const { wx, wy } = screenToWorld(e.clientX, e.clientY);
    dragStateRef.current = { lastWx: wx, lastWy: wy, moveIds };
    setDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const state = dragStateRef.current;
    if (!state) return;
    const { wx, wy } = screenToWorld(e.clientX, e.clientY);
    const dx = wx - state.lastWx;
    const dy = wy - state.lastWy;
    if (dx === 0 && dy === 0) return;
    state.lastWx = wx;
    state.lastWy = wy;
    moveNodesBy(state.moveIds, dx, dy);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (cardRef.current?.hasPointerCapture(e.pointerId)) {
      (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
    }
    dragStateRef.current = null;
    setDragging(false);
  };

  // Right-click handler — promotes this node to the selection (if it
  // isn't already part of it), then opens the context menu at the cursor.
  const onContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const store = useCanvasStore.getState();
    if (!store.selectedNodeIds.includes(node.id)) {
      store.selectNodes([node.id]);
    }
    openContextMenu(e.clientX, e.clientY, "selection");
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

  const kind = node.kind;
  const isSticky = kind === "sticky";
  const isFrame = kind === "frame";
  const isImage = kind === "image";
  const isLink = kind === "link";
  const isDrawing = kind === "drawing";

  // Map node.color to inline border/bg overrides. Frames + sticky have their
  // own default surface treatments below; for those we apply color as a tint
  // on top.
  const customColor = node.color ?? null;

  return (
    <motion.div
      ref={cardRef}
      data-node-id={node.id}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onContextMenu={onContextMenu}
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94 }}
      transition={{ duration: 0.16, ease: "easeOut" }}
      className={cn(
        "group pointer-events-auto absolute select-none overflow-hidden",
        "transition-[border-color,background-color,box-shadow] duration-150",
        // Per-kind base styling
        isSticky
          ? "rounded-[14px] border border-amber-400/25 shadow-[0_14px_30px_-12px_rgba(0,0,0,0.45)]"
          : isFrame
            ? cn(
                "rounded-2xl border border-dashed border-[var(--border-default)] bg-[var(--pane-1)] shadow-none",
                !readOnly && "hover:bg-[var(--pane-2)]",
              )
            : isImage
              ? "rounded-xl border border-[var(--node-card-border)] bg-[var(--node-card-bg)] shadow-[0_14px_30px_-12px_rgba(0,0,0,0.45)]"
              : isLink
                ? "rounded-xl border border-[var(--node-card-border)] bg-[var(--node-card-bg)] text-[var(--ink-1)] shadow-[0_14px_30px_-12px_rgba(0,0,0,0.45)] backdrop-blur-[6px]"
                : isDrawing
                  ? "rounded-md border border-transparent bg-transparent shadow-none"
                  : // card
                    "rounded-xl border border-[var(--node-card-border)] bg-[var(--node-card-bg)] text-[var(--ink-1)] shadow-[0_12px_30px_-12px_rgba(0,0,0,0.45)]",
        // Cursor — viewers never drag, so show pointer instead of grab and
        // suppress the hover-lift affordance.
        readOnly
          ? "cursor-pointer"
          : dragging
            ? "cursor-grabbing shadow-[0_18px_50px_-12px_rgba(0,0,0,0.55)]"
            : "cursor-grab backdrop-blur-[6px] hover:border-[var(--node-card-border-hover)]",
        // Selection
        isSelected &&
          "!border-[#7ad7ff]/70 shadow-[0_0_0_1px_rgba(122,215,255,0.55),0_18px_55px_-12px_rgba(122,215,255,0.30)]",
      )}
      style={{
        left: node.x,
        top: node.y,
        width: node.width,
        height: node.height,
        ...(customColor && (isSticky || (!isFrame && !isImage && !isLink))
          ? ({
              borderColor: `${customColor}55`,
              backgroundColor: `${customColor}${isSticky ? "26" : "14"}`,
              color: isSticky ? "#1a1404" : undefined,
            } as React.CSSProperties)
          : {}),
      }}
    >
      {!isDrawing && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-[var(--highlight)] to-transparent"
        />
      )}

      {isFrame ? (
        <FrameNodeContent node={node} />
      ) : isSticky ? (
        <StickyNodeContent node={node} />
      ) : isImage ? (
        <ImageNodeContent node={node} />
      ) : isLink ? (
        <LinkNodeContent node={node} />
      ) : isDrawing ? (
        <DrawingNodeContent node={node} />
      ) : (
        <CardNodeContent node={node} />
      )}

      {!isFrame && !isDrawing && !readOnly && (
        <div
          data-export-skip
          onPointerDown={onHandlePointerDown}
          title="Drag to connect"
          className={cn(
            "absolute top-1/2 -right-2 size-4 -translate-y-1/2 rounded-full border border-[var(--border-strong)] bg-[#7ad7ff]/85",
            "opacity-0 transition-opacity group-hover:opacity-100",
            isSelected && "opacity-100",
            "cursor-crosshair shadow-[0_0_10px_rgba(122,215,255,0.55)]",
          )}
        />
      )}
    </motion.div>
  );
}

// ─── per-kind content components ────────────────────────────────────────────

function CardNodeContent({ node }: { node: CanvasNode }) {
  const updateNodeContent = useCanvasStore((s) => s.updateNodeContent);
  const readOnly = useCanvasStore((s) => s.readOnly);
  return (
    <div className="relative flex h-full flex-col gap-2 p-4">
      <input
        value={node.title ?? ""}
        onChange={(e) => updateNodeContent(node.id, { title: e.target.value })}
        placeholder="Untitled"
        readOnly={readOnly}
        spellCheck={false}
        className="w-full cursor-text select-text border-none bg-transparent text-sm font-semibold tracking-tight text-[var(--ink-1)] outline-none placeholder:text-[var(--ink-4)]"
      />
      <textarea
        value={node.body ?? ""}
        onChange={(e) => updateNodeContent(node.id, { body: e.target.value })}
        placeholder="Add a note…"
        readOnly={readOnly}
        spellCheck={false}
        className="w-full flex-1 cursor-text select-text resize-none border-none bg-transparent text-xs leading-relaxed text-[var(--ink-2)] outline-none placeholder:text-[var(--ink-4)]"
      />
    </div>
  );
}

function DrawingNodeContent({ node }: { node: CanvasNode }) {
  const points = node.points ?? [];
  if (points.length < 2) return null;
  const stroke = node.strokeColor ?? "#7ad7ff";
  const width = node.strokeWidth ?? 3;
  return (
    <svg
      width={node.width}
      height={node.height}
      viewBox={`0 0 ${node.width} ${node.height}`}
      className="pointer-events-none absolute inset-0 overflow-visible"
    >
      <path
        d={buildSmoothPath(points)}
        stroke={stroke}
        strokeWidth={width}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StickyNodeContent({ node }: { node: CanvasNode }) {
  const updateNodeContent = useCanvasStore((s) => s.updateNodeContent);
  const readOnly = useCanvasStore((s) => s.readOnly);
  return (
    <div className="relative flex h-full flex-col p-3">
      <textarea
        value={node.body ?? ""}
        onChange={(e) => updateNodeContent(node.id, { body: e.target.value })}
        placeholder="Idea…"
        readOnly={readOnly}
        spellCheck={false}
        style={{ color: node.color ? "#1a1404" : "var(--sticky-default-text)" }}
        className="h-full w-full cursor-text select-text resize-none border-none bg-transparent text-[13px] leading-snug outline-none placeholder:opacity-50"
      />
    </div>
  );
}

function FrameNodeContent({ node }: { node: CanvasNode }) {
  const updateNodeContent = useCanvasStore((s) => s.updateNodeContent);
  const readOnly = useCanvasStore((s) => s.readOnly);
  return (
    <div className="relative flex h-full flex-col">
      <div className="flex items-center gap-1.5 border-b border-[var(--border-soft)] px-3 py-2">
        <span className="size-1.5 rounded-full bg-[var(--ink-3)]" />
        <input
          value={node.title ?? ""}
          onChange={(e) =>
            updateNodeContent(node.id, { title: e.target.value })
          }
          placeholder="Frame"
          readOnly={readOnly}
          spellCheck={false}
          className="w-full cursor-text select-text border-none bg-transparent text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--ink-2)] outline-none placeholder:text-[var(--ink-4)]"
        />
      </div>
      <div className="flex-1" />
    </div>
  );
}

function ImageNodeContent({ node }: { node: CanvasNode }) {
  const patchNode = useCanvasStore((s) => s.patchNode);
  const readOnly = useCanvasStore((s) => s.readOnly);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onFileSelected = async (file: File) => {
    if (file.size > 4 * 1024 * 1024) {
      console.warn(
        `[image] file too large (${(file.size / 1024 / 1024).toFixed(1)}MB) — max 4MB`,
      );
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        patchNode(node.id, { src: reader.result });
      }
    };
    reader.readAsDataURL(file);
  };

  if (!node.src) {
    if (readOnly) {
      return (
        <div className="relative flex h-full flex-col items-center justify-center gap-2 p-4 text-center text-[var(--ink-4)]">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="9" cy="9" r="2" />
            <path d="M21 15l-5-5L5 21" />
          </svg>
          <p className="text-[10px] uppercase tracking-[0.22em]">
            Empty image
          </p>
        </div>
      );
    }
    return (
      <div className="relative flex h-full flex-col items-center justify-center gap-3 p-4 text-center">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFileSelected(f);
          }}
        />
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-[var(--ink-3)]"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="9" cy="9" r="2" />
          <path d="M21 15l-5-5L5 21" />
        </svg>
        <p className="text-[11px] text-[var(--ink-3)]">
          Drop image to upload
        </p>
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            fileInputRef.current?.click();
          }}
          className="rounded-lg border border-[var(--border-default)] px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-[var(--ink-2)] transition-colors hover:bg-[var(--pane-2)] hover:text-[var(--ink-1)]"
        >
          Choose file
        </button>
        <p className="text-[10px] text-[var(--ink-4)]">or paste from clipboard</p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={node.src}
        alt={node.title ?? ""}
        draggable={false}
        className="h-full w-full select-none object-cover"
      />
    </div>
  );
}

function LinkNodeContent({ node }: { node: CanvasNode }) {
  const patchNode = useCanvasStore((s) => s.patchNode);
  const readOnly = useCanvasStore((s) => s.readOnly);
  const [draft, setDraft] = useState(node.url ?? "");
  const [fetching, startFetch] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(node.url ?? "");
  }, [node.url]);

  const onSubmit = (raw: string) => {
    const url = raw.trim();
    if (!url) return;
    patchNode(node.id, { url });
    setError(null);
    startFetch(async () => {
      const res = await fetchOgPreview(url);
      if (res.ok) {
        patchNode(node.id, {
          url: res.data.url,
          ogTitle: res.data.title ?? undefined,
          ogDescription: res.data.description ?? undefined,
          ogImage: res.data.image ?? undefined,
          ogSite: res.data.site ?? undefined,
        });
      } else {
        setError(res.error);
      }
    });
  };

  // No URL yet → small input prompt
  if (!node.url) {
    if (readOnly) {
      return (
        <div className="relative flex h-full flex-col items-center justify-center gap-2 text-center text-[var(--ink-4)]">
          <p className="text-[10px] uppercase tracking-[0.22em]">Empty link</p>
        </div>
      );
    }
    return (
      <div className="relative flex h-full flex-col justify-center gap-2 p-4">
        <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--ink-3)]">
          Paste a URL
        </p>
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onSubmit(draft);
            }
          }}
          onBlur={() => draft && onSubmit(draft)}
          spellCheck={false}
          placeholder="https://…"
          className="w-full cursor-text select-text rounded-md border border-[var(--border-soft)] bg-[var(--pane-2)] px-2 py-1.5 text-xs text-[var(--ink-1)] outline-none placeholder:text-[var(--ink-4)] focus:border-[var(--border-strong)]"
        />
      </div>
    );
  }

  return (
    <div className="relative flex h-full w-full overflow-hidden">
      {node.ogImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={node.ogImage}
          alt=""
          draggable={false}
          className="h-full w-2/5 select-none border-r border-[var(--border-faint)] object-cover"
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 p-3 pr-9">
        <span className="truncate text-[10px] uppercase tracking-[0.18em] text-[var(--ink-3)]">
          {node.ogSite ?? new URL(node.url).hostname}
        </span>
        <span className="line-clamp-2 text-sm font-medium leading-tight text-[var(--ink-1)]">
          {node.ogTitle ?? (fetching ? "Loading…" : node.url)}
        </span>
        {node.ogDescription && (
          <span className="line-clamp-2 text-[11px] text-[var(--ink-2)]">
            {node.ogDescription}
          </span>
        )}
        {error && (
          <span className="text-[10px] text-red-700 dark:text-red-500/80">{error}</span>
        )}
      </div>
      {/* Explicit "open in new tab" button — keeps the rest of the card free
          for selecting / dragging / right-clicking like any other node. */}
      <a
        href={node.url}
        target="_blank"
        rel="noopener noreferrer"
        data-export-skip
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        title="Open link in new tab"
        className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-md border border-[var(--border-default)] bg-[var(--surface-85)] text-[var(--ink-2)] backdrop-blur-md transition-colors hover:border-[var(--border-emphasis)] hover:text-[var(--ink-1)]"
      >
        <svg
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
          <polyline points="15 3 21 3 21 9" />
          <line x1="10" y1="14" x2="21" y2="3" />
        </svg>
      </a>
    </div>
  );
}

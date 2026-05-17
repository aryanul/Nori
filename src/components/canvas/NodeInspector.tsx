"use client";

import { useCanvasStore } from "@/store/canvas-store";

const SWATCHES: Array<{ value: string | null; label: string }> = [
  { value: null, label: "Default" },
  { value: "#7ad7ff", label: "Cyan" },
  { value: "#a78bfa", label: "Violet" },
  { value: "#e98dd8", label: "Magenta" },
  { value: "#34d399", label: "Emerald" },
  { value: "#f5cd7a", label: "Amber" },
  { value: "#fb7185", label: "Rose" },
];

/**
 * Inline color picker. Shows below the single selected node — hidden when
 * 0 or multiple nodes are selected.
 */
export function NodeInspector() {
  const selectedIds = useCanvasStore((s) => s.selectedNodeIds);
  const nodes = useCanvasStore((s) => s.nodes);
  const setNodeColor = useCanvasStore((s) => s.setNodeColor);
  const readOnly = useCanvasStore((s) => s.readOnly);

  if (readOnly) return null;
  if (selectedIds.length !== 1) return null;
  const node = nodes[selectedIds[0]];
  if (!node) return null;
  // Frames don't have a useful "color" — skip the inspector for them.
  if (node.kind === "frame") return null;

  return (
    <div
      data-export-skip
      className="pointer-events-auto absolute flex items-center gap-1 rounded-xl border border-white/[0.09] bg-[#0a0b10]/95 px-2 py-1.5 backdrop-blur-md shadow-[0_10px_30px_-10px_rgba(0,0,0,0.6)]"
      style={{
        left: node.x,
        top: node.y + node.height + 10,
        // counter-scale isn't applied here; rely on world transform so this
        // inspector zooms with the canvas. That's acceptable — it's bound
        // to the node it's annotating.
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {SWATCHES.map((s) => {
        const isActive =
          (s.value === null && !node.color) || node.color === s.value;
        return (
          <button
            key={s.label}
            type="button"
            title={s.label}
            onClick={(e) => {
              e.stopPropagation();
              setNodeColor(node.id, s.value);
            }}
            className="relative flex size-5 items-center justify-center rounded-full border border-white/15 transition-transform hover:scale-110"
            style={{
              background:
                s.value ??
                "repeating-linear-gradient(45deg, rgba(255,255,255,0.15) 0 2px, transparent 2px 5px)",
            }}
          >
            {isActive && (
              <span className="absolute inset-0 rounded-full ring-2 ring-white/85" />
            )}
          </button>
        );
      })}
    </div>
  );
}

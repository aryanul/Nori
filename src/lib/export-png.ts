import { toPng } from "html-to-image";
import type { CanvasNode } from "@/types/canvas";

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

/**
 * Given a set of node ids the user picked, return the FULL set that should
 * actually be exported. Specifically: any frame in the picked set pulls in
 * every node that visually overlaps it. Mirrors the same "frames are visual
 * containers" model the drag handler uses.
 */
export function expandFramesToContents(
  ids: string[],
  allNodes: Record<string, CanvasNode>,
): string[] {
  const out = new Set(ids);
  for (const id of ids) {
    const frame = allNodes[id];
    if (!frame || frame.kind !== "frame") continue;
    for (const other of Object.values(allNodes)) {
      if (other.id === frame.id) continue;
      if (rectsOverlap(frame, other)) {
        out.add(other.id);
      }
    }
  }
  return Array.from(out);
}

const EXPORT_PADDING = 32;
const EXPORT_PIXEL_RATIO = 2;
const EXPORT_BG = "#08090d";

type ExportOpts = {
  filename?: string;
};

/**
 * Render the given nodes (and only the connections between them) to a PNG
 * and trigger a browser download.
 *
 * Implementation: capture the *world-transform wrapper* (which already contains
 * NodeCards + ConnectionsLayer + the dotted grid) and crop to the bounding
 * box of the target nodes. `filter` strips overlays + non-target elements
 * from the clone html-to-image walks.
 */
export async function exportNodesAsPng(
  worldWrapper: HTMLElement,
  nodes: CanvasNode[],
  opts: ExportOpts = {},
): Promise<void> {
  if (nodes.length === 0) {
    console.warn("[export-png] nothing to export");
    return;
  }

  // Compute bounding box (in world coords)
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const n of nodes) {
    minX = Math.min(minX, n.x);
    minY = Math.min(minY, n.y);
    maxX = Math.max(maxX, n.x + n.width);
    maxY = Math.max(maxY, n.y + n.height);
  }
  const bx = minX - EXPORT_PADDING;
  const by = minY - EXPORT_PADDING;
  const bw = maxX - minX + EXPORT_PADDING * 2;
  const bh = maxY - minY + EXPORT_PADDING * 2;

  const exportSet = new Set(nodes.map((n) => n.id));

  // html-to-image's filter walks every node in the cloned tree. We strip:
  //   - elements explicitly marked `data-export-skip` (overlays, handles)
  //   - NodeCards whose data-node-id isn't in the export set
  //   - connection <g>s where either endpoint isn't in the export set
  const filter = (el: HTMLElement | Element): boolean => {
    if (!(el instanceof Element)) return true;
    if (
      el instanceof HTMLElement &&
      el.dataset &&
      "exportSkip" in el.dataset
    ) {
      return false;
    }
    // SVG elements: dataset may exist on SVGElement too. Check getAttribute as a
    // fallback because some older browser combos don't expose it on SVG.
    if (
      el instanceof SVGElement &&
      el.getAttribute("data-export-skip") !== null
    ) {
      return false;
    }

    const nodeId =
      el instanceof HTMLElement
        ? el.dataset?.nodeId
        : el.getAttribute("data-node-id") ?? undefined;
    if (nodeId && !exportSet.has(nodeId)) return false;

    const fromId =
      el instanceof HTMLElement
        ? el.dataset?.fromId
        : el.getAttribute("data-from-id") ?? undefined;
    const toId =
      el instanceof HTMLElement
        ? el.dataset?.toId
        : el.getAttribute("data-to-id") ?? undefined;
    if (fromId && toId) {
      if (!exportSet.has(fromId) || !exportSet.has(toId)) return false;
    }

    return true;
  };

  const dataUrl = await toPng(worldWrapper, {
    width: bw,
    height: bh,
    pixelRatio: EXPORT_PIXEL_RATIO,
    backgroundColor: EXPORT_BG,
    cacheBust: true,
    style: {
      transform: `translate(${-bx}px, ${-by}px)`,
      transformOrigin: "0 0",
    },
    filter,
  });

  triggerDownload(dataUrl, opts.filename ?? "nori-export.png");
}

function triggerDownload(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export function suggestFilename(workspaceTitle: string, suffix?: string): string {
  const slug = (workspaceTitle || "nori")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "nori";
  const stamp = new Date()
    .toISOString()
    .replace(/[-:T]/g, "")
    .slice(0, 13); // YYYYMMDDhhmm
  return `${slug}${suffix ? `-${suffix}` : ""}-${stamp}.png`;
}

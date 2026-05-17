import { create } from "zustand";
import type {
  CanvasNode,
  Connection,
  NodeKind,
  Viewport,
} from "@/types/canvas";

export type Tool = "select" | "card" | "sticky" | "frame" | "image" | "link";

export type PendingConnection = {
  fromNodeId: string;
  toX: number;
  toY: number;
} | null;

export type SelectionRect = {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
} | null;

export type ContextMenuState =
  | {
      visible: true;
      screenX: number;
      screenY: number;
      // 'selection': right-clicked a node (or a member of the selection).
      //              Acts on selectedNodeIds at the time the menu opens.
      // 'canvas':    right-clicked empty canvas. Workspace-level actions.
      variant: "selection" | "canvas";
    }
  | { visible: false };

type CanvasState = {
  workspaceId: string | null;
  viewport: Viewport;
  nodes: Record<string, CanvasNode>;
  connections: Record<string, Connection>;
  selectedNodeIds: string[];
  selectedConnectionId: string | null;
  pendingConnection: PendingConnection;
  selectionRect: SelectionRect;
  activeTool: Tool;
  shortcutsOpen: boolean;
  commandPaletteOpen: boolean;
  readOnly: boolean;
  contextMenu: ContextMenuState;

  hydrate: (snapshot: {
    workspaceId: string;
    nodes: CanvasNode[];
    connections: Connection[];
    readOnly?: boolean;
  }) => void;
  setReadOnly: (readOnly: boolean) => void;
  openContextMenu: (
    screenX: number,
    screenY: number,
    variant: "selection" | "canvas",
  ) => void;
  closeContextMenu: () => void;
  replaceCanvasState: (
    nodes: Record<string, CanvasNode>,
    connections: Record<string, Connection>,
  ) => void;
  replaceNodes: (nodes: Record<string, CanvasNode>) => void;
  replaceConnections: (connections: Record<string, Connection>) => void;

  setViewport: (v: Viewport) => void;
  panBy: (dx: number, dy: number) => void;
  zoomAt: (factor: number, clientX: number, clientY: number) => void;
  resetViewport: () => void;
  flyToPoint: (worldX: number, worldY: number) => void;

  setActiveTool: (tool: Tool) => void;
  toggleShortcuts: () => void;
  setShortcutsOpen: (open: boolean) => void;
  toggleCommandPalette: () => void;
  setCommandPaletteOpen: (open: boolean) => void;

  createNode: (x: number, y: number, kind?: NodeKind) => string;
  addNode: (node: CanvasNode) => void;
  moveNode: (id: string, x: number, y: number) => void;
  moveNodesBy: (ids: string[], dx: number, dy: number) => void;
  updateNodeContent: (
    id: string,
    patch: { title?: string; body?: string },
  ) => void;
  setNodeColor: (id: string, color: string | null) => void;
  patchNode: (id: string, patch: Partial<CanvasNode>) => void;
  removeNode: (id: string) => void;
  removeNodes: (ids: string[]) => void;

  addConnection: (fromNodeId: string, toNodeId: string) => string | null;
  removeConnection: (id: string) => void;

  selectNodes: (ids: string[]) => void;
  toggleNodeInSelection: (id: string) => void;
  selectConnection: (id: string | null) => void;
  selectAllNodes: () => void;
  clearSelection: () => void;

  setSelectionRect: (rect: SelectionRect) => void;
  commitSelectionRect: (additive: boolean) => void;

  startPendingConnection: (fromNodeId: string, x: number, y: number) => void;
  updatePendingConnection: (x: number, y: number) => void;
  endPendingConnection: (toNodeId: string | null) => void;
};

const MIN_SCALE = 0.1;
const MAX_SCALE = 4;
const INITIAL_VIEWPORT: Viewport = { x: 0, y: 0, scale: 1 };

let idCounter = 0;
const nextId = (prefix: string) => {
  idCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${idCounter}`;
};

const NODE_DEFAULTS: Record<
  NodeKind,
  { width: number; height: number; color?: string }
> = {
  card: { width: 240, height: 140 },
  sticky: { width: 180, height: 180, color: "#f5cd7a" },
  frame: { width: 480, height: 320 },
  image: { width: 280, height: 200 },
  link: { width: 320, height: 140 },
};

const seedNodes: CanvasNode[] = [
  {
    id: "n1",
    kind: "card",
    x: 120,
    y: 80,
    width: 240,
    height: 140,
    title: "Welcome to Nori",
    body: "Double-click empty space to create a node. Shift+drag to box-select. Press ? for shortcuts.",
  },
  {
    id: "n2",
    kind: "sticky",
    x: 460,
    y: 220,
    width: 200,
    height: 200,
    title: "Sticky idea",
    body: "Spatial workspace primitive.",
    color: "#f5cd7a",
  },
];

const seedConnections: Connection[] = [];

function rectIntersectsNode(
  rect: { x: number; y: number; width: number; height: number },
  node: CanvasNode,
): boolean {
  return !(
    rect.x + rect.width < node.x ||
    rect.y + rect.height < node.y ||
    rect.x > node.x + node.width ||
    rect.y > node.y + node.height
  );
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  workspaceId: null,
  viewport: INITIAL_VIEWPORT,
  nodes: Object.fromEntries(seedNodes.map((n) => [n.id, n])),
  connections: Object.fromEntries(seedConnections.map((c) => [c.id, c])),
  selectedNodeIds: [],
  selectedConnectionId: null,
  pendingConnection: null,
  selectionRect: null,
  activeTool: "select",
  shortcutsOpen: false,
  commandPaletteOpen: false,
  readOnly: false,
  contextMenu: { visible: false },

  hydrate: ({ workspaceId, nodes, connections, readOnly = false }) =>
    set({
      workspaceId,
      nodes: Object.fromEntries(nodes.map((n) => [n.id, n])),
      connections: Object.fromEntries(connections.map((c) => [c.id, c])),
      selectedNodeIds: [],
      selectedConnectionId: null,
      pendingConnection: null,
      selectionRect: null,
      viewport: INITIAL_VIEWPORT,
      readOnly,
    }),
  setReadOnly: (readOnly) => set({ readOnly }),
  openContextMenu: (screenX, screenY, variant) =>
    set({ contextMenu: { visible: true, screenX, screenY, variant } }),
  closeContextMenu: () => set({ contextMenu: { visible: false } }),

  replaceCanvasState: (nodes, connections) => set({ nodes, connections }),
  replaceNodes: (nodes) => set({ nodes }),
  replaceConnections: (connections) => set({ connections }),

  setViewport: (v) => set({ viewport: v }),
  panBy: (dx, dy) =>
    set((state) => ({
      viewport: {
        ...state.viewport,
        x: state.viewport.x + dx,
        y: state.viewport.y + dy,
      },
    })),
  zoomAt: (factor, clientX, clientY) =>
    set((state) => {
      const { x, y, scale } = state.viewport;
      const nextScale = Math.min(
        MAX_SCALE,
        Math.max(MIN_SCALE, scale * factor),
      );
      const k = nextScale / scale;
      return {
        viewport: {
          scale: nextScale,
          x: clientX - (clientX - x) * k,
          y: clientY - (clientY - y) * k,
        },
      };
    }),
  resetViewport: () => set({ viewport: INITIAL_VIEWPORT }),

  flyToPoint: (worldX, worldY) => {
    if (typeof window === "undefined") return;
    const startVp = get().viewport;
    const targetX = window.innerWidth / 2 - worldX * startVp.scale;
    const targetY = window.innerHeight / 2 - worldY * startVp.scale;
    const startTime = performance.now();
    const duration = 380;

    const step = (now: number) => {
      const t = Math.min(1, (now - startTime) / duration);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3);
      const current = get().viewport;
      set({
        viewport: {
          scale: current.scale, // user might zoom mid-flight; respect it
          x: startVp.x + (targetX - startVp.x) * eased,
          y: startVp.y + (targetY - startVp.y) * eased,
        },
      });
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  },

  setActiveTool: (tool) => set({ activeTool: tool }),
  toggleShortcuts: () =>
    set((state) => ({ shortcutsOpen: !state.shortcutsOpen })),
  setShortcutsOpen: (open) => set({ shortcutsOpen: open }),
  toggleCommandPalette: () =>
    set((state) => ({ commandPaletteOpen: !state.commandPaletteOpen })),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),

  createNode: (x, y, kind = "card") => {
    if (get().readOnly) return "";
    const id = nextId("n");
    const defaults = NODE_DEFAULTS[kind];
    const node: CanvasNode = {
      id,
      kind,
      x: x - defaults.width / 2,
      y: y - defaults.height / 2,
      width: defaults.width,
      height: defaults.height,
      title: "",
      body: "",
      color: defaults.color,
    };
    set((state) => ({
      nodes: { ...state.nodes, [id]: node },
      selectedNodeIds: [id],
      selectedConnectionId: null,
    }));
    return id;
  },

  addNode: (node) =>
    set((state) => ({ nodes: { ...state.nodes, [node.id]: node } })),

  moveNode: (id, x, y) =>
    set((state) => {
      const existing = state.nodes[id];
      if (!existing) return state;
      return { nodes: { ...state.nodes, [id]: { ...existing, x, y } } };
    }),

  moveNodesBy: (ids, dx, dy) =>
    set((state) => {
      if (state.readOnly) return state;
      if (ids.length === 0 || (dx === 0 && dy === 0)) return state;
      const nextNodes = { ...state.nodes };
      let changed = false;
      for (const id of ids) {
        const n = nextNodes[id];
        if (!n) continue;
        nextNodes[id] = { ...n, x: n.x + dx, y: n.y + dy };
        changed = true;
      }
      return changed ? { nodes: nextNodes } : state;
    }),

  updateNodeContent: (id, patch) =>
    set((state) => {
      if (state.readOnly) return state;
      const existing = state.nodes[id];
      if (!existing) return state;
      const next = { ...existing, ...patch };
      if (next.title === existing.title && next.body === existing.body) {
        return state;
      }
      return { nodes: { ...state.nodes, [id]: next } };
    }),

  setNodeColor: (id, color) =>
    set((state) => {
      if (state.readOnly) return state;
      const existing = state.nodes[id];
      if (!existing) return state;
      return {
        nodes: {
          ...state.nodes,
          [id]: { ...existing, color: color ?? undefined },
        },
      };
    }),

  patchNode: (id, patch) =>
    set((state) => {
      if (state.readOnly) return state;
      const existing = state.nodes[id];
      if (!existing) return state;
      return {
        nodes: { ...state.nodes, [id]: { ...existing, ...patch } },
      };
    }),

  removeNode: (id) =>
    set((state) => {
      if (state.readOnly) return state;
      const { [id]: _, ...restNodes } = state.nodes;
      const restConnections = Object.fromEntries(
        Object.entries(state.connections).filter(
          ([, c]) => c.fromNodeId !== id && c.toNodeId !== id,
        ),
      );
      return {
        nodes: restNodes,
        connections: restConnections,
        selectedNodeIds: state.selectedNodeIds.filter((sid) => sid !== id),
      };
    }),

  removeNodes: (ids) =>
    set((state) => {
      if (state.readOnly) return state;
      if (ids.length === 0) return state;
      const drop = new Set(ids);
      const restNodes: Record<string, CanvasNode> = {};
      for (const [k, v] of Object.entries(state.nodes)) {
        if (!drop.has(k)) restNodes[k] = v;
      }
      const restConnections: Record<string, Connection> = {};
      for (const [k, c] of Object.entries(state.connections)) {
        if (!drop.has(c.fromNodeId) && !drop.has(c.toNodeId)) {
          restConnections[k] = c;
        }
      }
      return {
        nodes: restNodes,
        connections: restConnections,
        selectedNodeIds: state.selectedNodeIds.filter((id) => !drop.has(id)),
      };
    }),

  addConnection: (fromNodeId, toNodeId) => {
    if (get().readOnly) return null;
    if (fromNodeId === toNodeId) return null;
    const exists = Object.values(get().connections).some(
      (c) => c.fromNodeId === fromNodeId && c.toNodeId === toNodeId,
    );
    if (exists) return null;
    const id = nextId("c");
    set((state) => ({
      connections: {
        ...state.connections,
        [id]: { id, fromNodeId, toNodeId },
      },
    }));
    return id;
  },

  removeConnection: (id) =>
    set((state) => {
      if (state.readOnly) return state;
      const { [id]: _, ...rest } = state.connections;
      return {
        connections: rest,
        selectedConnectionId:
          state.selectedConnectionId === id ? null : state.selectedConnectionId,
      };
    }),

  selectNodes: (ids) =>
    set({ selectedNodeIds: ids, selectedConnectionId: null }),

  toggleNodeInSelection: (id) =>
    set((state) => {
      const has = state.selectedNodeIds.includes(id);
      return {
        selectedNodeIds: has
          ? state.selectedNodeIds.filter((sid) => sid !== id)
          : [...state.selectedNodeIds, id],
        selectedConnectionId: null,
      };
    }),

  selectConnection: (id) =>
    set({ selectedConnectionId: id, selectedNodeIds: [] }),

  selectAllNodes: () =>
    set((state) => ({
      selectedNodeIds: Object.keys(state.nodes),
      selectedConnectionId: null,
    })),

  clearSelection: () =>
    set({ selectedNodeIds: [], selectedConnectionId: null }),

  setSelectionRect: (rect) => set({ selectionRect: rect }),

  commitSelectionRect: (additive) => {
    const state = get();
    const rect = state.selectionRect;
    if (!rect) return;
    const x = Math.min(rect.startX, rect.endX);
    const y = Math.min(rect.startY, rect.endY);
    const width = Math.abs(rect.endX - rect.startX);
    const height = Math.abs(rect.endY - rect.startY);
    if (width < 2 && height < 2) {
      set({ selectionRect: null });
      return;
    }
    const hitIds: string[] = [];
    const probe = { x, y, width, height };
    for (const node of Object.values(state.nodes)) {
      if (rectIntersectsNode(probe, node)) hitIds.push(node.id);
    }
    const next = additive
      ? Array.from(new Set([...state.selectedNodeIds, ...hitIds]))
      : hitIds;
    set({
      selectedNodeIds: next,
      selectedConnectionId: null,
      selectionRect: null,
    });
  },

  startPendingConnection: (fromNodeId, x, y) =>
    set({ pendingConnection: { fromNodeId, toX: x, toY: y } }),

  updatePendingConnection: (x, y) =>
    set((state) => {
      if (!state.pendingConnection) return state;
      return {
        pendingConnection: { ...state.pendingConnection, toX: x, toY: y },
      };
    }),

  endPendingConnection: (toNodeId) => {
    const pending = get().pendingConnection;
    set({ pendingConnection: null });
    if (pending && toNodeId) {
      get().addConnection(pending.fromNodeId, toNodeId);
    }
  },
}));

export const nodeCenter = (n: CanvasNode) => ({
  x: n.x + n.width / 2,
  y: n.y + n.height / 2,
});

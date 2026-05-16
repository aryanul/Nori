import { create } from "zustand";
import type { CanvasNode, Connection, NodeKind, Viewport } from "@/types/canvas";

export type Selection =
  | { type: "node"; id: string }
  | { type: "connection"; id: string }
  | null;

export type PendingConnection = {
  fromNodeId: string;
  toX: number;
  toY: number;
} | null;

export type SaveStatus = "idle" | "saving" | "saved" | "error";

type CanvasState = {
  workspaceId: string | null;
  viewport: Viewport;
  nodes: Record<string, CanvasNode>;
  connections: Record<string, Connection>;
  selection: Selection;
  pendingConnection: PendingConnection;
  saveStatus: SaveStatus;
  lastSavedAt: string | null;

  hydrate: (snapshot: {
    workspaceId: string;
    nodes: CanvasNode[];
    connections: Connection[];
  }) => void;
  setSaveStatus: (status: SaveStatus, savedAt?: string) => void;
  getSnapshot: () => { nodes: CanvasNode[]; connections: Connection[] };

  setViewport: (v: Viewport) => void;
  panBy: (dx: number, dy: number) => void;
  zoomAt: (factor: number, clientX: number, clientY: number) => void;
  resetViewport: () => void;

  createNode: (x: number, y: number, kind?: NodeKind) => string;
  addNode: (node: CanvasNode) => void;
  moveNode: (id: string, x: number, y: number) => void;
  removeNode: (id: string) => void;

  addConnection: (fromNodeId: string, toNodeId: string) => string | null;
  removeConnection: (id: string) => void;

  select: (selection: Selection) => void;
  clearSelection: () => void;

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

const NODE_DEFAULTS: Record<NodeKind, { width: number; height: number; title: string; body: string; color?: string }> = {
  card: { width: 240, height: 140, title: "New card", body: "Click to edit" },
  sticky: { width: 200, height: 200, title: "Sticky", body: "Idea", color: "#facc15" },
  frame: { width: 360, height: 240, title: "Frame", body: "" },
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
    body: "Double-click empty space to create a node. Shift-drag from a node edge to connect them.",
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
    color: "#facc15",
  },
  {
    id: "n3",
    kind: "card",
    x: 820,
    y: 60,
    width: 260,
    height: 160,
    title: "Realtime soon",
    body: "Yjs + Hocuspocus will sync this state across collaborators.",
  },
];

const seedConnections: Connection[] = [
  { id: "c1", fromNodeId: "n1", toNodeId: "n2" },
  { id: "c2", fromNodeId: "n2", toNodeId: "n3" },
];

export const useCanvasStore = create<CanvasState>((set, get) => ({
  workspaceId: null,
  viewport: INITIAL_VIEWPORT,
  nodes: Object.fromEntries(seedNodes.map((n) => [n.id, n])),
  connections: Object.fromEntries(seedConnections.map((c) => [c.id, c])),
  selection: null,
  pendingConnection: null,
  saveStatus: "idle",
  lastSavedAt: null,

  hydrate: ({ workspaceId, nodes, connections }) =>
    set({
      workspaceId,
      nodes: Object.fromEntries(nodes.map((n) => [n.id, n])),
      connections: Object.fromEntries(connections.map((c) => [c.id, c])),
      selection: null,
      pendingConnection: null,
      viewport: INITIAL_VIEWPORT,
      saveStatus: "idle",
      lastSavedAt: null,
    }),

  setSaveStatus: (status, savedAt) =>
    set((state) => ({
      saveStatus: status,
      lastSavedAt: savedAt ?? state.lastSavedAt,
    })),

  getSnapshot: () => {
    const state = get();
    return {
      nodes: Object.values(state.nodes),
      connections: Object.values(state.connections),
    };
  },

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
      const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale * factor));
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

  createNode: (x, y, kind = "card") => {
    const id = nextId("n");
    const defaults = NODE_DEFAULTS[kind];
    const node: CanvasNode = {
      id,
      kind,
      x: x - defaults.width / 2,
      y: y - defaults.height / 2,
      width: defaults.width,
      height: defaults.height,
      title: defaults.title,
      body: defaults.body,
      color: defaults.color,
    };
    set((state) => ({
      nodes: { ...state.nodes, [id]: node },
      selection: { type: "node", id },
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

  removeNode: (id) =>
    set((state) => {
      const { [id]: _, ...restNodes } = state.nodes;
      const restConnections = Object.fromEntries(
        Object.entries(state.connections).filter(
          ([, c]) => c.fromNodeId !== id && c.toNodeId !== id,
        ),
      );
      const selection =
        state.selection?.type === "node" && state.selection.id === id
          ? null
          : state.selection;
      return { nodes: restNodes, connections: restConnections, selection };
    }),

  addConnection: (fromNodeId, toNodeId) => {
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
      const { [id]: _, ...rest } = state.connections;
      const selection =
        state.selection?.type === "connection" && state.selection.id === id
          ? null
          : state.selection;
      return { connections: rest, selection };
    }),

  select: (selection) => set({ selection }),
  clearSelection: () => set({ selection: null }),

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

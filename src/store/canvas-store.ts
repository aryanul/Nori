import { create } from "zustand";
import type {
  ActivityEvent,
  ActivityKind,
  CanvasNode,
  Connection,
  NodeKind,
  NodeThread,
  ThreadMessage,
  Viewport,
} from "@/types/canvas";

export type Tool =
  | "select"
  | "card"
  | "sticky"
  | "frame"
  | "image"
  | "link"
  | "draw";

const ACTIVITY_CAP = 200;

export type ActivityActor = {
  id: string;
  name: string;
  color: string;
};

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
  threads: Record<string, NodeThread>;
  activities: Record<string, ActivityEvent>;
  selectedNodeIds: string[];
  selectedConnectionId: string | null;
  pendingConnection: PendingConnection;
  selectionRect: SelectionRect;
  activeTool: Tool;
  shortcutsOpen: boolean;
  commandPaletteOpen: boolean;
  activityPanelOpen: boolean;
  // Which node's thread panel is currently open (null = none).
  openThreadNodeId: string | null;
  readOnly: boolean;
  contextMenu: ContextMenuState;
  // Identity of the local user — set by useRealtime so action sites can
  // attribute activity events.
  currentActor: ActivityActor | null;

  hydrate: (snapshot: {
    workspaceId: string;
    nodes: CanvasNode[];
    connections: Connection[];
    threads?: NodeThread[];
    activities?: ActivityEvent[];
    readOnly?: boolean;
  }) => void;
  setReadOnly: (readOnly: boolean) => void;
  setCurrentActor: (actor: ActivityActor | null) => void;
  replaceActivities: (activities: Record<string, ActivityEvent>) => void;
  toggleActivityPanel: () => void;
  setActivityPanelOpen: (open: boolean) => void;
  openContextMenu: (
    screenX: number,
    screenY: number,
    variant: "selection" | "canvas",
  ) => void;
  closeContextMenu: () => void;
  replaceCanvasState: (
    nodes: Record<string, CanvasNode>,
    connections: Record<string, Connection>,
    threads?: Record<string, NodeThread>,
  ) => void;
  replaceNodes: (nodes: Record<string, CanvasNode>) => void;
  replaceConnections: (connections: Record<string, Connection>) => void;
  replaceThreads: (threads: Record<string, NodeThread>) => void;

  // Threads / comments
  openThreadFor: (nodeId: string | null) => void;
  createThread: (
    nodeId: string,
    message: Omit<ThreadMessage, "id" | "createdAt">,
  ) => string | null;
  addMessageToThread: (
    threadId: string,
    message: Omit<ThreadMessage, "id" | "createdAt">,
  ) => string | null;
  setThreadResolved: (threadId: string, resolved: boolean) => void;
  deleteThread: (threadId: string) => void;

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
  createDrawingNode: (
    worldPoints: number[],
    strokeColor: string,
    strokeWidth: number,
  ) => string | null;
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
  drawing: { width: 120, height: 120 },
};

// Throttle "node_edited" emits per (actor, node) so rapid typing collapses to
// one feed entry. Map<`${actorId}|${nodeId}`, lastEmitMs>.
const EDIT_DEBOUNCE_MS = 5000;
const lastEditEmit = new Map<string, number>();

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

type ActivityInput = {
  kind: ActivityKind;
  targetNodeId?: string;
  targetLabel?: string;
  targetNodeKind?: NodeKind;
};

function nodeLabel(node: CanvasNode | undefined): string | undefined {
  if (!node) return undefined;
  const title = (node.title ?? "").trim();
  if (title) return title.slice(0, 80);
  const body = (node.body ?? "").trim();
  if (body) return body.slice(0, 80);
  return undefined;
}

function pruneActivities(
  map: Record<string, ActivityEvent>,
): Record<string, ActivityEvent> {
  const entries = Object.values(map);
  if (entries.length <= ACTIVITY_CAP) return map;
  entries.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const keep = entries.slice(entries.length - ACTIVITY_CAP);
  return Object.fromEntries(keep.map((e) => [e.id, e]));
}

// Build a new activities map by appending an event attributed to currentActor.
// Returns the unchanged map when there's no actor (e.g. SSR or before
// useRealtime has run) or when readOnly viewers somehow reach an emit site.
function appendActivity(
  state: { activities: Record<string, ActivityEvent>; currentActor: ActivityActor | null; readOnly: boolean; nodes: Record<string, CanvasNode> },
  input: ActivityInput,
): Record<string, ActivityEvent> {
  if (state.readOnly) return state.activities;
  const actor = state.currentActor;
  if (!actor) return state.activities;
  const id = nextId("a");
  const ev: ActivityEvent = {
    id,
    kind: input.kind,
    actorId: actor.id,
    actorName: actor.name,
    actorColor: actor.color,
    targetNodeId: input.targetNodeId,
    targetLabel:
      input.targetLabel ??
      (input.targetNodeId ? nodeLabel(state.nodes[input.targetNodeId]) : undefined),
    targetNodeKind: input.targetNodeKind,
    createdAt: new Date().toISOString(),
  };
  return pruneActivities({ ...state.activities, [id]: ev });
}

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
  threads: {},
  activities: {},
  selectedNodeIds: [],
  selectedConnectionId: null,
  pendingConnection: null,
  selectionRect: null,
  activeTool: "select",
  shortcutsOpen: false,
  commandPaletteOpen: false,
  activityPanelOpen: false,
  openThreadNodeId: null,
  readOnly: false,
  contextMenu: { visible: false },
  currentActor: null,

  hydrate: ({
    workspaceId,
    nodes,
    connections,
    threads = [],
    activities = [],
    readOnly = false,
  }) =>
    set({
      workspaceId,
      nodes: Object.fromEntries(nodes.map((n) => [n.id, n])),
      connections: Object.fromEntries(connections.map((c) => [c.id, c])),
      threads: Object.fromEntries(threads.map((t) => [t.id, t])),
      activities: Object.fromEntries(activities.map((a) => [a.id, a])),
      selectedNodeIds: [],
      selectedConnectionId: null,
      pendingConnection: null,
      selectionRect: null,
      viewport: INITIAL_VIEWPORT,
      openThreadNodeId: null,
      readOnly,
    }),
  setReadOnly: (readOnly) => set({ readOnly }),
  setCurrentActor: (actor) => set({ currentActor: actor }),
  replaceActivities: (activities) => set({ activities }),
  toggleActivityPanel: () =>
    set((state) => ({ activityPanelOpen: !state.activityPanelOpen })),
  setActivityPanelOpen: (open) => set({ activityPanelOpen: open }),
  openContextMenu: (screenX, screenY, variant) =>
    set({ contextMenu: { visible: true, screenX, screenY, variant } }),
  closeContextMenu: () => set({ contextMenu: { visible: false } }),

  replaceCanvasState: (nodes, connections, threads) =>
    set((state) => ({
      nodes,
      connections,
      threads: threads ?? state.threads,
    })),
  replaceNodes: (nodes) => set({ nodes }),
  replaceConnections: (connections) => set({ connections }),
  replaceThreads: (threads) => set({ threads }),

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
      activities: appendActivity(state, {
        kind: "node_created",
        targetNodeId: id,
        targetNodeKind: kind,
      }),
    }));
    return id;
  },

  createDrawingNode: (worldPoints, strokeColor, strokeWidth) => {
    if (get().readOnly) return null;
    if (worldPoints.length < 4) return null;
    // Compute bounding box, pad by stroke width so the stroke isn't clipped.
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (let i = 0; i < worldPoints.length; i += 2) {
      const px = worldPoints[i];
      const py = worldPoints[i + 1];
      if (px < minX) minX = px;
      if (py < minY) minY = py;
      if (px > maxX) maxX = px;
      if (py > maxY) maxY = py;
    }
    const pad = strokeWidth + 2;
    const x = minX - pad;
    const y = minY - pad;
    const width = Math.max(maxX - minX + pad * 2, strokeWidth * 2);
    const height = Math.max(maxY - minY + pad * 2, strokeWidth * 2);
    // Convert to node-local coords.
    const local: number[] = new Array(worldPoints.length);
    for (let i = 0; i < worldPoints.length; i += 2) {
      local[i] = worldPoints[i] - x;
      local[i + 1] = worldPoints[i + 1] - y;
    }
    const id = nextId("n");
    const node: CanvasNode = {
      id,
      kind: "drawing",
      x,
      y,
      width,
      height,
      points: local,
      strokeColor,
      strokeWidth,
    };
    set((state) => ({
      nodes: { ...state.nodes, [id]: node },
      selectedNodeIds: [id],
      selectedConnectionId: null,
      activities: appendActivity(state, {
        kind: "node_created",
        targetNodeId: id,
        targetNodeKind: "drawing",
      }),
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
      // Debounce edit activities per (actor, node) so a typing session
      // produces one feed entry, not one per keystroke.
      const actorId = state.currentActor?.id ?? "anon";
      const key = `${actorId}|${id}`;
      const now = Date.now();
      const last = lastEditEmit.get(key) ?? 0;
      let activities = state.activities;
      if (now - last >= EDIT_DEBOUNCE_MS) {
        lastEditEmit.set(key, now);
        activities = appendActivity(
          { ...state, nodes: { ...state.nodes, [id]: next } },
          {
            kind: "node_edited",
            targetNodeId: id,
            targetNodeKind: existing.kind,
          },
        );
      }
      return { nodes: { ...state.nodes, [id]: next }, activities };
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

  openThreadFor: (nodeId) => set({ openThreadNodeId: nodeId }),

  createThread: (nodeId, message) => {
    const state = get();
    if (state.readOnly) return null;
    // 1:1 — if a thread already exists for this node, just add to it.
    const existing = Object.values(state.threads).find(
      (t) => t.nodeId === nodeId,
    );
    if (existing) {
      return get().addMessageToThread(existing.id, message);
    }
    const id = nextId("t");
    const now = new Date().toISOString();
    const msg: ThreadMessage = {
      id: nextId("m"),
      ...message,
      createdAt: now,
    };
    const thread: NodeThread = {
      id,
      nodeId,
      messages: [msg],
      resolved: false,
      createdAt: now,
      updatedAt: now,
    };
    set({
      threads: { ...state.threads, [id]: thread },
      openThreadNodeId: nodeId,
      activities: appendActivity(state, {
        kind: "thread_message_added",
        targetNodeId: nodeId,
        targetNodeKind: state.nodes[nodeId]?.kind,
      }),
    });
    return id;
  },

  addMessageToThread: (threadId, message) => {
    const state = get();
    if (state.readOnly) return null;
    const thread = state.threads[threadId];
    if (!thread) return null;
    const now = new Date().toISOString();
    const msg: ThreadMessage = {
      id: nextId("m"),
      ...message,
      createdAt: now,
    };
    set({
      threads: {
        ...state.threads,
        [threadId]: {
          ...thread,
          messages: [...thread.messages, msg],
          resolved: false,
          updatedAt: now,
        },
      },
      activities: appendActivity(state, {
        kind: "thread_message_added",
        targetNodeId: thread.nodeId,
        targetNodeKind: state.nodes[thread.nodeId]?.kind,
      }),
    });
    return msg.id;
  },

  setThreadResolved: (threadId, resolved) =>
    set((state) => {
      if (state.readOnly) return state;
      const thread = state.threads[threadId];
      if (!thread) return state;
      return {
        threads: {
          ...state.threads,
          [threadId]: {
            ...thread,
            resolved,
            updatedAt: new Date().toISOString(),
          },
        },
        activities: resolved
          ? appendActivity(state, {
              kind: "thread_resolved",
              targetNodeId: thread.nodeId,
              targetNodeKind: state.nodes[thread.nodeId]?.kind,
            })
          : state.activities,
      };
    }),

  deleteThread: (threadId) =>
    set((state) => {
      if (state.readOnly) return state;
      const { [threadId]: _, ...rest } = state.threads;
      return {
        threads: rest,
        openThreadNodeId:
          state.openThreadNodeId &&
          state.threads[threadId]?.nodeId === state.openThreadNodeId
            ? null
            : state.openThreadNodeId,
      };
    }),

  removeNode: (id) =>
    set((state) => {
      if (state.readOnly) return state;
      const removed = state.nodes[id];
      const { [id]: _, ...restNodes } = state.nodes;
      const restConnections = Object.fromEntries(
        Object.entries(state.connections).filter(
          ([, c]) => c.fromNodeId !== id && c.toNodeId !== id,
        ),
      );
      const restThreads = Object.fromEntries(
        Object.entries(state.threads).filter(([, t]) => t.nodeId !== id),
      );
      const activities = removed
        ? appendActivity(state, {
            kind: "node_deleted",
            targetNodeId: id,
            targetNodeKind: removed.kind,
            targetLabel: nodeLabel(removed),
          })
        : state.activities;
      return {
        nodes: restNodes,
        connections: restConnections,
        threads: restThreads,
        activities,
        selectedNodeIds: state.selectedNodeIds.filter((sid) => sid !== id),
        openThreadNodeId:
          state.openThreadNodeId === id ? null : state.openThreadNodeId,
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
      const restThreads: Record<string, NodeThread> = {};
      for (const [k, t] of Object.entries(state.threads)) {
        if (!drop.has(t.nodeId)) restThreads[k] = t;
      }
      // Emit one delete event per removed node so the feed reads as a list
      // of distinct deletions rather than a single batch entry.
      let activities = state.activities;
      let working = state;
      for (const id of ids) {
        const removed = state.nodes[id];
        if (!removed) continue;
        activities = appendActivity(working, {
          kind: "node_deleted",
          targetNodeId: id,
          targetNodeKind: removed.kind,
          targetLabel: nodeLabel(removed),
        });
        working = { ...working, activities };
      }
      return {
        nodes: restNodes,
        connections: restConnections,
        threads: restThreads,
        activities,
        selectedNodeIds: state.selectedNodeIds.filter((id) => !drop.has(id)),
        openThreadNodeId:
          state.openThreadNodeId && drop.has(state.openThreadNodeId)
            ? null
            : state.openThreadNodeId,
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

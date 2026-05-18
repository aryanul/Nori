export type Viewport = {
  x: number;
  y: number;
  scale: number;
};

export type NodeKind =
  | "card"
  | "sticky"
  | "frame"
  | "image"
  | "link"
  | "drawing";

export type CanvasNode = {
  id: string;
  kind: NodeKind;
  x: number;
  y: number;
  width: number;
  height: number;
  title?: string;
  body?: string;
  color?: string;

  // Image nodes
  src?: string;

  // Link nodes
  url?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogSite?: string;

  // Drawing nodes — points are flat [x0,y0,x1,y1,...] in node-local space
  // (so the stroke pans/scales with the node's bounding box).
  points?: number[];
  strokeColor?: string;
  strokeWidth?: number;
};

export type Connection = {
  id: string;
  fromNodeId: string;
  toNodeId: string;
};

export type ThreadMessage = {
  id: string;
  authorId: string;
  authorName: string;
  authorColor: string;
  body: string;
  /** ISO timestamp. */
  createdAt: string;
};

export type NodeThread = {
  id: string;
  /** The node this thread is anchored to. */
  nodeId: string;
  messages: ThreadMessage[];
  resolved: boolean;
  /** ISO timestamps. */
  createdAt: string;
  updatedAt: string;
};

export type ActivityKind =
  | "node_created"
  | "node_deleted"
  | "node_edited"
  | "thread_message_added"
  | "thread_resolved";

export type ActivityEvent = {
  id: string;
  kind: ActivityKind;
  actorId: string;
  actorName: string;
  actorColor: string;
  /** Optional — set for any event tied to a specific node. */
  targetNodeId?: string;
  /** Snapshot of the node's title (or body if no title) at event time, so the
   *  feed reads coherently even after the node is deleted. */
  targetLabel?: string;
  /** Type of node the event was about, for richer feed copy ("created a card"). */
  targetNodeKind?: NodeKind;
  /** ISO timestamp. */
  createdAt: string;
};

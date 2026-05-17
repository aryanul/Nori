export type Viewport = {
  x: number;
  y: number;
  scale: number;
};

export type NodeKind = "card" | "sticky" | "frame" | "image" | "link";

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

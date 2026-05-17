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

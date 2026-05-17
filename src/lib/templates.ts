import type { CanvasNode, Connection } from "@/types/canvas";

export type TemplateId = "blank" | "brainstorm" | "roadmap";

export type WorkspaceTemplate = {
  id: TemplateId;
  title: string;
  description: string;
  hint: string;
  build: () => { title: string; nodes: CanvasNode[]; connections: Connection[] };
};

function n(
  partial: Partial<CanvasNode> & {
    kind: CanvasNode["kind"];
    x: number;
    y: number;
  },
): CanvasNode {
  const idCounter = (n as unknown as { _i?: number })._i ?? 0;
  (n as unknown as { _i?: number })._i = idCounter + 1;
  return {
    id: `seed_${Date.now().toString(36)}_${idCounter}`,
    title: "",
    body: "",
    width: 240,
    height: 140,
    ...partial,
  };
}

function c(fromId: string, toId: string): Connection {
  return {
    id: `seed_c_${fromId}_${toId}`,
    fromNodeId: fromId,
    toNodeId: toId,
  };
}

const BRAINSTORM: WorkspaceTemplate = {
  id: "brainstorm",
  title: "Brainstorm",
  description: "A topic in the middle, sticky ideas around it.",
  hint: "Add stickies around the topic, group them, connect related ones.",
  build: () => {
    const topic = n({
      kind: "card",
      x: 320,
      y: 240,
      width: 280,
      height: 130,
      title: "Topic",
      body: "What are we exploring?",
    });
    const stickies = [
      n({
        kind: "sticky",
        x: 60,
        y: 80,
        width: 180,
        height: 180,
        body: "Idea 1",
        color: "#f5cd7a",
      }),
      n({
        kind: "sticky",
        x: 700,
        y: 80,
        width: 180,
        height: 180,
        body: "Idea 2",
        color: "#e98dd8",
      }),
      n({
        kind: "sticky",
        x: 60,
        y: 460,
        width: 180,
        height: 180,
        body: "Question",
        color: "#7ad7ff",
      }),
      n({
        kind: "sticky",
        x: 700,
        y: 460,
        width: 180,
        height: 180,
        body: "Hypothesis",
        color: "#34d399",
      }),
    ];
    return {
      title: "Brainstorm",
      nodes: [topic, ...stickies],
      connections: stickies.map((s) => c(s.id, topic.id)),
    };
  },
};

const ROADMAP: WorkspaceTemplate = {
  id: "roadmap",
  title: "Project roadmap",
  description: "Three frames: backlog, in progress, shipped.",
  hint: "Drag cards between frames as work moves forward.",
  build: () => {
    const backlog = n({
      kind: "frame",
      x: 40,
      y: 60,
      width: 360,
      height: 520,
      title: "Backlog",
    });
    const inProgress = n({
      kind: "frame",
      x: 440,
      y: 60,
      width: 360,
      height: 520,
      title: "In progress",
    });
    const shipped = n({
      kind: "frame",
      x: 840,
      y: 60,
      width: 360,
      height: 520,
      title: "Shipped",
    });
    const card1 = n({
      kind: "card",
      x: 80,
      y: 130,
      title: "First task",
      body: "Describe what needs to happen.",
    });
    const card2 = n({
      kind: "card",
      x: 80,
      y: 310,
      title: "Second task",
      body: "Another item to tackle.",
    });
    const card3 = n({
      kind: "card",
      x: 480,
      y: 130,
      title: "Currently working on",
      body: "Move this card to “Shipped” when done.",
    });
    return {
      title: "Project roadmap",
      nodes: [backlog, inProgress, shipped, card1, card2, card3],
      connections: [],
    };
  },
};

const BLANK: WorkspaceTemplate = {
  id: "blank",
  title: "Blank canvas",
  description: "An empty workspace. Double-click to add your first node.",
  hint: "Press ? to see all shortcuts.",
  build: () => ({
    title: "Untitled workspace",
    nodes: [],
    connections: [],
  }),
};

export const TEMPLATES: WorkspaceTemplate[] = [BLANK, BRAINSTORM, ROADMAP];

export function getTemplate(id: TemplateId): WorkspaceTemplate {
  return TEMPLATES.find((t) => t.id === id) ?? BLANK;
}

"use server";

import mongoose from "mongoose";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { connectDB } from "@/lib/mongoose";
import { Workspace } from "@/lib/models/workspace";
import { NodeModel } from "@/lib/models/node";
import { ConnectionModel } from "@/lib/models/connection";
import type { CanvasNode, Connection } from "@/types/canvas";

export type WorkspaceSnapshot = {
  id: string;
  title: string;
  nodes: CanvasNode[];
  connections: Connection[];
};

export async function createWorkspaceAndRedirect(): Promise<never> {
  await connectDB();
  const ws = await Workspace.create({ title: "Untitled workspace" });
  redirect(`/w/${ws._id.toString()}`);
}

export async function getWorkspace(
  id: string,
): Promise<WorkspaceSnapshot | null> {
  await connectDB();
  if (!mongoose.Types.ObjectId.isValid(id)) return null;

  const ws = await Workspace.findById(id).lean();
  if (!ws) return null;

  const [nodes, connections] = await Promise.all([
    NodeModel.find({ workspaceId: ws._id }).lean(),
    ConnectionModel.find({ workspaceId: ws._id }).lean(),
  ]);

  return {
    id: ws._id.toString(),
    title: ws.title,
    nodes: nodes.map((n) => ({
      id: n._id,
      kind: n.kind as CanvasNode["kind"],
      x: n.x,
      y: n.y,
      width: n.width,
      height: n.height,
      title: n.title ?? "",
      body: n.body ?? "",
      color: n.color ?? undefined,
    })),
    connections: connections.map((c) => ({
      id: c._id,
      fromNodeId: c.fromNodeId,
      toNodeId: c.toNodeId,
    })),
  };
}

export async function saveWorkspace(
  id: string,
  nodes: CanvasNode[],
  connections: Connection[],
): Promise<{ ok: true; savedAt: string }> {
  await connectDB();
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("Invalid workspace id");
  }
  const workspaceId = new mongoose.Types.ObjectId(id);

  // Coarse-grained save: replace all nodes/connections for this workspace.
  // Pre-Yjs bridge — will be replaced by Hocuspocus-driven persistence.
  await Promise.all([
    NodeModel.deleteMany({ workspaceId }),
    ConnectionModel.deleteMany({ workspaceId }),
  ]);

  if (nodes.length > 0) {
    await NodeModel.insertMany(
      nodes.map((n) => ({
        _id: n.id,
        workspaceId,
        kind: n.kind,
        x: n.x,
        y: n.y,
        width: n.width,
        height: n.height,
        title: n.title ?? "",
        body: n.body ?? "",
        color: n.color ?? null,
      })),
    );
  }

  if (connections.length > 0) {
    await ConnectionModel.insertMany(
      connections.map((c) => ({
        _id: c.id,
        workspaceId,
        fromNodeId: c.fromNodeId,
        toNodeId: c.toNodeId,
      })),
    );
  }

  await Workspace.updateOne({ _id: workspaceId }, { $set: { updatedAt: new Date() } });
  revalidatePath(`/w/${id}`);
  return { ok: true, savedAt: new Date().toISOString() };
}

export async function listRecentWorkspaces(limit = 10) {
  await connectDB();
  const items = await Workspace.find()
    .sort({ updatedAt: -1 })
    .limit(limit)
    .lean();
  return items.map((w) => ({
    id: w._id.toString(),
    title: w.title,
    updatedAt: w.updatedAt.toISOString(),
  }));
}

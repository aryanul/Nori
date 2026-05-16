"use server";

import { randomUUID } from "crypto";
import mongoose from "mongoose";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongoose";
import { Workspace } from "@/lib/models/workspace";
import { NodeModel } from "@/lib/models/node";
import { ConnectionModel } from "@/lib/models/connection";
import {
  userCanAccessWorkspace,
  userOwnsWorkspace,
} from "@/lib/workspace-access";
import type { CanvasNode, Connection } from "@/types/canvas";

export type WorkspaceSnapshot = {
  id: string;
  title: string;
  nodes: CanvasNode[];
  connections: Connection[];
  isOwner: boolean;
  inviteToken: string | null;
  memberCount: number;
};

async function requireUserId(): Promise<mongoose.Types.ObjectId> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Not authenticated");
  }
  return new mongoose.Types.ObjectId(session.user.id);
}

export async function createWorkspaceAndRedirect(): Promise<never> {
  const userId = await requireUserId();
  await connectDB();
  const ws = await Workspace.create({
    title: "Untitled workspace",
    ownerId: userId,
    inviteToken: randomUUID(),
  });
  redirect(`/w/${ws._id.toString()}`);
}

export async function getWorkspace(
  id: string,
): Promise<WorkspaceSnapshot | null> {
  const userId = await requireUserId();
  await connectDB();
  if (!mongoose.Types.ObjectId.isValid(id)) return null;

  const ws = await Workspace.findById(id).lean();
  if (!ws) return null;
  if (!userCanAccessWorkspace(ws, userId)) return null;

  const isOwner = userOwnsWorkspace(ws, userId);

  // Lazy-backfill: workspaces created before the members slice don't have an
  // inviteToken. When the owner opens such a workspace, mint one and persist
  // so the Share button starts working.
  let inviteToken: string | null = ws.inviteToken ?? null;
  if (isOwner && !inviteToken) {
    inviteToken = randomUUID();
    await Workspace.updateOne(
      { _id: ws._id },
      { $set: { inviteToken } },
    );
  }

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
    isOwner,
    // Only the owner needs the token (to display in the Share modal).
    inviteToken: isOwner ? inviteToken : null,
    memberCount: Array.isArray(ws.members) ? ws.members.length : 0,
  };
}

export async function saveWorkspace(
  id: string,
  nodes: CanvasNode[],
  connections: Connection[],
): Promise<{ ok: true; savedAt: string }> {
  const userId = await requireUserId();
  await connectDB();
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("Invalid workspace id");
  }
  const workspaceId = new mongoose.Types.ObjectId(id);
  const ws = await Workspace.findById(workspaceId).lean();
  if (!ws || !userCanAccessWorkspace(ws, userId)) {
    throw new Error("Workspace not accessible");
  }

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

  await Workspace.updateOne(
    { _id: workspaceId },
    { $set: { updatedAt: new Date() } },
  );
  revalidatePath(`/w/${id}`);
  return { ok: true, savedAt: new Date().toISOString() };
}

/**
 * Add the current user to a workspace's members[] iff the invite token
 * matches. Idempotent — if the user is already owner or already a member,
 * just returns success. Returns the workspace id on success or null on
 * failure (so callers can render a 404 / sensible fallback).
 */
export type JoinResult =
  | { ok: true; reason: "added" | "owner" | "already_member" }
  | { ok: false; reason: "invalid_id" | "no_token" | "not_found" | "token_mismatch" };

export async function joinWorkspaceByToken(
  id: string,
  token: string,
): Promise<JoinResult> {
  const userId = await requireUserId();
  await connectDB();
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return { ok: false, reason: "invalid_id" };
  }
  if (!token) return { ok: false, reason: "no_token" };

  const ws = await Workspace.findById(id).lean();
  if (!ws) return { ok: false, reason: "not_found" };

  if (userOwnsWorkspace(ws, userId)) {
    return { ok: true, reason: "owner" };
  }

  if (!ws.inviteToken || ws.inviteToken !== token) {
    console.warn(
      `[joinWorkspaceByToken] token mismatch for workspace ${id} ` +
        `(db: ${ws.inviteToken ? `${ws.inviteToken.slice(0, 8)}…` : "null"}, ` +
        `url: ${token.slice(0, 8)}…)`,
    );
    return { ok: false, reason: "token_mismatch" };
  }

  if (userCanAccessWorkspace(ws, userId)) {
    return { ok: true, reason: "already_member" };
  }

  await Workspace.updateOne(
    { _id: ws._id },
    { $addToSet: { members: userId } },
  );

  return { ok: true, reason: "added" };
}

export async function listRecentWorkspaces(limit = 10) {
  const userId = await requireUserId();
  await connectDB();
  const items = await Workspace.find({
    $or: [{ ownerId: userId }, { members: userId }, { ownerId: null }],
  })
    .sort({ updatedAt: -1 })
    .limit(limit)
    .lean();
  return items.map((w) => {
    const isOwner = userOwnsWorkspace(w, userId);
    return {
      id: w._id.toString(),
      title: w.title,
      updatedAt: w.updatedAt.toISOString(),
      isOwner,
      isLegacyOrphan: w.ownerId == null,
      isShared: !isOwner && w.ownerId != null,
    };
  });
}

import { config } from "dotenv";
config({ path: ".env.local" });

import mongoose from "mongoose";
import { Server } from "@hocuspocus/server";
import { connectDB } from "@/lib/mongoose";
import { Workspace } from "@/lib/models/workspace";
import { NodeModel } from "@/lib/models/node";
import { ConnectionModel } from "@/lib/models/connection";
import { verifyRealtimeToken } from "@/lib/realtime/token";
import { userCanAccessWorkspace } from "@/lib/workspace-access";
import type { CanvasNode, Connection } from "@/types/canvas";

const PORT = Number(process.env.HOCUSPOCUS_PORT ?? 1234);

function isValidId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id);
}

const server = new Server({
  port: PORT,
  debounce: 1000,
  maxDebounce: 5000,
  quiet: false,

  async onAuthenticate({ token, documentName }) {
    if (!token) {
      console.warn(
        `[Hocuspocus] auth rejected for ${documentName}: missing token`,
      );
      throw new Error("Missing authentication token");
    }

    let payload;
    try {
      payload = await verifyRealtimeToken(token);
    } catch (err) {
      console.warn(
        `[Hocuspocus] auth rejected for ${documentName}: invalid token`,
        err instanceof Error ? err.message : err,
      );
      throw new Error("Invalid authentication token");
    }

    if (payload.workspaceId !== documentName) {
      console.warn(
        `[Hocuspocus] auth rejected: token workspace ${payload.workspaceId} ` +
          `doesn't match connected document ${documentName}`,
      );
      throw new Error("Token does not authorize this workspace");
    }

    if (!isValidId(documentName)) {
      throw new Error("Invalid workspace id");
    }
    await connectDB();
    const workspaceId = new mongoose.Types.ObjectId(documentName);
    const ws = await Workspace.findById(workspaceId).lean();
    if (!ws) {
      throw new Error("Workspace not found");
    }
    if (
      !userCanAccessWorkspace(
        ws,
        new mongoose.Types.ObjectId(payload.userId),
      )
    ) {
      console.warn(
        `[Hocuspocus] auth rejected: user ${payload.userId} not a member of workspace ${documentName}`,
      );
      throw new Error("Not authorized for this workspace");
    }

    console.log(
      `[Hocuspocus] authed user ${payload.userId} → workspace ${documentName}`,
    );
    return { userId: payload.userId };
  },

  async onLoadDocument({ document, documentName }) {
    if (!isValidId(documentName)) {
      console.warn(`[Hocuspocus] Invalid workspace id: ${documentName}`);
      return;
    }
    await connectDB();
    const workspaceId = new mongoose.Types.ObjectId(documentName);

    const ws = await Workspace.findById(workspaceId).lean();
    if (!ws) {
      console.warn(`[Hocuspocus] Workspace ${documentName} not found in DB`);
      return;
    }

    const [nodes, connections] = await Promise.all([
      NodeModel.find({ workspaceId }).lean(),
      ConnectionModel.find({ workspaceId }).lean(),
    ]);

    const nodesMap = document.getMap<CanvasNode>("nodes");
    const connectionsMap = document.getMap<Connection>("connections");

    document.transact(() => {
      for (const n of nodes) {
        if (!nodesMap.has(n._id)) {
          nodesMap.set(n._id, {
            id: n._id,
            kind: n.kind as CanvasNode["kind"],
            x: n.x,
            y: n.y,
            width: n.width,
            height: n.height,
            title: n.title ?? "",
            body: n.body ?? "",
            color: n.color ?? undefined,
            src: n.src ?? undefined,
            url: n.url ?? undefined,
            ogTitle: n.ogTitle ?? undefined,
            ogDescription: n.ogDescription ?? undefined,
            ogImage: n.ogImage ?? undefined,
            ogSite: n.ogSite ?? undefined,
          });
        }
      }
      for (const c of connections) {
        if (!connectionsMap.has(c._id)) {
          connectionsMap.set(c._id, {
            id: c._id,
            fromNodeId: c.fromNodeId,
            toNodeId: c.toNodeId,
          });
        }
      }
    });

    console.log(
      `[Hocuspocus] Loaded workspace ${documentName} — ${nodes.length} nodes, ${connections.length} connections`,
    );
  },

  async onStoreDocument({ document, documentName }) {
    if (!isValidId(documentName)) return;
    await connectDB();
    const workspaceId = new mongoose.Types.ObjectId(documentName);

    const nodesMap = document.getMap<CanvasNode>("nodes");
    const connectionsMap = document.getMap<Connection>("connections");

    const nodes: CanvasNode[] = [];
    nodesMap.forEach((value) => nodes.push(value));

    const connections: Connection[] = [];
    connectionsMap.forEach((value) => connections.push(value));

    // Coarse-grained replace, consistent with the prior manual-save behavior.
    // Switching to fine-grained upserts (via document events) is a follow-up.
    await Promise.all([
      NodeModel.deleteMany({ workspaceId }),
      ConnectionModel.deleteMany({ workspaceId }),
    ]);

    if (nodes.length) {
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
          src: n.src ?? null,
          url: n.url ?? null,
          ogTitle: n.ogTitle ?? null,
          ogDescription: n.ogDescription ?? null,
          ogImage: n.ogImage ?? null,
          ogSite: n.ogSite ?? null,
        })),
      );
    }

    if (connections.length) {
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

    console.log(
      `[Hocuspocus] Stored workspace ${documentName} — ${nodes.length} nodes, ${connections.length} connections`,
    );
  },
});

async function main() {
  await server.listen();
  console.log(`[Hocuspocus] listening on ws://localhost:${PORT}`);
}

main().catch((err) => {
  console.error("[Hocuspocus] fatal", err);
  process.exit(1);
});

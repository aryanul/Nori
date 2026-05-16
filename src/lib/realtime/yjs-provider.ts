import * as Y from "yjs";
import { WebrtcProvider } from "y-webrtc";
import type { CanvasNode, Connection } from "@/types/canvas";

export type RealtimeEntry = {
  workspaceId: string;
  doc: Y.Doc;
  provider: WebrtcProvider;
  nodesMap: Y.Map<CanvasNode>;
  connectionsMap: Y.Map<Connection>;
  refCount: number;
};

const entries = new Map<string, RealtimeEntry>();

export const LOCAL_ORIGIN = Symbol("nori:local");
export const REMOTE_ORIGIN = Symbol("nori:remote");

export function acquireProvider(workspaceId: string): RealtimeEntry {
  const existing = entries.get(workspaceId);
  if (existing) {
    existing.refCount += 1;
    return existing;
  }

  const doc = new Y.Doc();
  const nodesMap = doc.getMap<CanvasNode>("nodes");
  const connectionsMap = doc.getMap<Connection>("connections");

  // Use y-webrtc's bundled signaling defaults (currently fly.dev + signaling.yjs.dev).
  // The old Heroku endpoints were removed when Heroku killed free dynos.
  const provider = new WebrtcProvider(`nori-ws-${workspaceId}`, doc);

  if (typeof window !== "undefined") {
    // Diagnostics — visible in browser DevTools console.
    console.log(
      `[Nori realtime] provider created for workspace ${workspaceId}`,
      { room: `nori-ws-${workspaceId}`, clientId: provider.awareness.clientID },
    );
    provider.on("peers", (event: {
      added: string[];
      removed: string[];
      webrtcPeers: string[];
      bcPeers: string[];
    }) => {
      console.log("[Nori realtime] peers", {
        webrtc: event.webrtcPeers.length,
        broadcastChannel: event.bcPeers.length,
        added: event.added,
        removed: event.removed,
      });
    });
    provider.on(
      "status",
      (event: { connected: boolean }) => {
        console.log("[Nori realtime] signaling status", event);
      },
    );
  }

  const entry: RealtimeEntry = {
    workspaceId,
    doc,
    provider,
    nodesMap,
    connectionsMap,
    refCount: 1,
  };
  entries.set(workspaceId, entry);
  return entry;
}

export function releaseProvider(workspaceId: string) {
  const entry = entries.get(workspaceId);
  if (!entry) return;
  entry.refCount -= 1;
  if (entry.refCount <= 0) {
    entry.provider.disconnect();
    entry.provider.destroy();
    entry.doc.destroy();
    entries.delete(workspaceId);
  }
}

export function getProvider(workspaceId: string): RealtimeEntry | null {
  return entries.get(workspaceId) ?? null;
}

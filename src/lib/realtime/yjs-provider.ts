import * as Y from "yjs";
import { HocuspocusProvider } from "@hocuspocus/provider";
import type {
  ActivityEvent,
  CanvasNode,
  Connection,
  NodeThread,
} from "@/types/canvas";

export type RealtimeEntry = {
  workspaceId: string;
  doc: Y.Doc;
  provider: HocuspocusProvider;
  nodesMap: Y.Map<CanvasNode>;
  connectionsMap: Y.Map<Connection>;
  threadsMap: Y.Map<NodeThread>;
  activitiesMap: Y.Map<ActivityEvent>;
  refCount: number;
};

const entries = new Map<string, RealtimeEntry>();

export const LOCAL_ORIGIN = Symbol("nori:local");
export const REMOTE_ORIGIN = Symbol("nori:remote");

function resolveServerUrl(): string {
  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_HOCUSPOCUS_URL) {
    return process.env.NEXT_PUBLIC_HOCUSPOCUS_URL;
  }
  return "ws://localhost:1234";
}

export function acquireProvider(
  workspaceId: string,
  token: string,
): RealtimeEntry {
  const existing = entries.get(workspaceId);
  if (existing) {
    existing.refCount += 1;
    return existing;
  }

  const doc = new Y.Doc();
  const nodesMap = doc.getMap<CanvasNode>("nodes");
  const connectionsMap = doc.getMap<Connection>("connections");
  const threadsMap = doc.getMap<NodeThread>("threads");
  const activitiesMap = doc.getMap<ActivityEvent>("activities");

  const url = resolveServerUrl();
  const provider = new HocuspocusProvider({
    url,
    name: workspaceId,
    document: doc,
    token,
  });

  if (typeof window !== "undefined") {
    console.log(`[Nori realtime] HocuspocusProvider created`, {
      url,
      workspaceId,
      clientId: provider.awareness?.clientID,
    });
    provider.on("status", (event: { status: string }) => {
      console.log("[Nori realtime] status", event.status);
    });
    provider.on("synced", (event: { state: boolean }) => {
      console.log("[Nori realtime] synced", event.state);
    });
    provider.on("disconnect", () => {
      console.log("[Nori realtime] disconnected");
    });
  }

  const entry: RealtimeEntry = {
    workspaceId,
    doc,
    provider,
    nodesMap,
    connectionsMap,
    threadsMap,
    activitiesMap,
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
    entry.provider.destroy();
    entry.doc.destroy();
    entries.delete(workspaceId);
  }
}

export function getProvider(workspaceId: string): RealtimeEntry | null {
  return entries.get(workspaceId) ?? null;
}

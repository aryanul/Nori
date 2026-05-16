"use client";

import { useEffect, useRef, useState } from "react";
import * as Y from "yjs";
import {
  acquireProvider,
  releaseProvider,
  LOCAL_ORIGIN,
  type RealtimeEntry,
} from "@/lib/realtime/yjs-provider";
import { getOrCreateUserIdentity } from "@/lib/realtime/identity";
import { useCanvasStore } from "@/store/canvas-store";
import type { CanvasNode, Connection } from "@/types/canvas";
import type { PeerState, UserIdentity } from "@/types/realtime";

type RemoteCursorPublisher = (worldX: number, worldY: number) => void;

export type RealtimeStatus = "connecting" | "live" | "solo" | "offline";

type UseRealtimeResult = {
  ready: boolean;
  self: UserIdentity | null;
  peers: PeerState[];
  publishCursor: RemoteCursorPublisher;
  status: RealtimeStatus;
};

function syncObjectToYMap<T extends { id: string }>(
  map: Y.Map<T>,
  obj: Record<string, T>,
) {
  for (const id in obj) {
    const existing = map.get(id);
    if (!existing || JSON.stringify(existing) !== JSON.stringify(obj[id])) {
      map.set(id, obj[id]);
    }
  }
  for (const id of Array.from(map.keys())) {
    if (!(id in obj)) {
      map.delete(id);
    }
  }
}

function ymapToObject<T>(map: Y.Map<T>): Record<string, T> {
  const out: Record<string, T> = {};
  map.forEach((value, key) => {
    out[key] = value;
  });
  return out;
}

export function useRealtime(workspaceId: string | null): UseRealtimeResult {
  const [self, setSelf] = useState<UserIdentity | null>(null);
  const [peers, setPeers] = useState<PeerState[]>([]);
  const [ready, setReady] = useState(false);
  const [signalingConnected, setSignalingConnected] = useState(false);
  const [graceExpired, setGraceExpired] = useState(false);
  const entryRef = useRef<RealtimeEntry | null>(null);
  const applyingRemoteRef = useRef(false);

  useEffect(() => {
    if (!workspaceId) return;
    const identity = getOrCreateUserIdentity();
    setSelf(identity);

    const entry = acquireProvider(workspaceId);
    entryRef.current = entry;
    const { doc, provider, nodesMap, connectionsMap } = entry;

    // 1. Seed Y.Maps from current Zustand state — only if empty
    //    (so we don't clobber state already received from peers)
    const currentState = useCanvasStore.getState();
    if (nodesMap.size === 0 && connectionsMap.size === 0) {
      doc.transact(() => {
        for (const node of Object.values(currentState.nodes)) {
          nodesMap.set(node.id, node);
        }
        for (const conn of Object.values(currentState.connections)) {
          connectionsMap.set(conn.id, conn);
        }
      }, LOCAL_ORIGIN);
    } else {
      // 2. Y.Maps already populated (peer or previous mount) → pull into Zustand
      applyingRemoteRef.current = true;
      useCanvasStore.setState((state) => ({
        nodes: ymapToObject<CanvasNode>(nodesMap),
        connections: ymapToObject<Connection>(connectionsMap),
        version: state.version + 1,
      }));
      applyingRemoteRef.current = false;
    }

    // 3. Y.Map → Zustand (remote changes)
    const onNodesChange = (
      _event: Y.YMapEvent<CanvasNode>,
      transaction: Y.Transaction,
    ) => {
      if (transaction.origin === LOCAL_ORIGIN) return;
      applyingRemoteRef.current = true;
      useCanvasStore.setState((state) => ({
        nodes: ymapToObject<CanvasNode>(nodesMap),
        version: state.version + 1,
      }));
      applyingRemoteRef.current = false;
    };
    const onConnectionsChange = (
      _event: Y.YMapEvent<Connection>,
      transaction: Y.Transaction,
    ) => {
      if (transaction.origin === LOCAL_ORIGIN) return;
      applyingRemoteRef.current = true;
      useCanvasStore.setState((state) => ({
        connections: ymapToObject<Connection>(connectionsMap),
        version: state.version + 1,
      }));
      applyingRemoteRef.current = false;
    };
    nodesMap.observe(onNodesChange);
    connectionsMap.observe(onConnectionsChange);

    // 4. Zustand → Y.Map (local edits)
    let lastNodes = useCanvasStore.getState().nodes;
    let lastConnections = useCanvasStore.getState().connections;
    const unsubStore = useCanvasStore.subscribe((state) => {
      if (
        state.nodes === lastNodes &&
        state.connections === lastConnections
      ) {
        return;
      }
      const changedNodes = state.nodes !== lastNodes;
      const changedConnections = state.connections !== lastConnections;
      lastNodes = state.nodes;
      lastConnections = state.connections;
      if (applyingRemoteRef.current) return;
      doc.transact(() => {
        if (changedNodes) syncObjectToYMap(nodesMap, state.nodes);
        if (changedConnections)
          syncObjectToYMap(connectionsMap, state.connections);
      }, LOCAL_ORIGIN);
    });

    // 5. Awareness — local identity + peer subscription
    provider.awareness.setLocalState({
      user: identity,
      cursor: null,
    });

    const onAwarenessChange = () => {
      const states = provider.awareness.getStates();
      const list: PeerState[] = [];
      states.forEach((value, clientId) => {
        if (clientId === provider.awareness.clientID) return;
        const v = value as {
          user?: UserIdentity;
          cursor?: { x: number; y: number } | null;
        };
        if (!v.user) return;
        list.push({
          clientId,
          user: v.user,
          cursor: v.cursor ?? null,
        });
      });
      setPeers(list);
    };
    provider.awareness.on("change", onAwarenessChange);
    onAwarenessChange();

    // 6. Signaling status — flips to true when at least one signaling
    //    connection is open; flips back when all close.
    const onStatus = (e: { connected: boolean }) => {
      setSignalingConnected(e.connected);
    };
    provider.on("status", onStatus);

    // Grace period: give signaling a few seconds to connect before we
    // declare "offline" in the UI.
    const graceTimer = window.setTimeout(() => setGraceExpired(true), 4000);

    setReady(true);

    return () => {
      window.clearTimeout(graceTimer);
      nodesMap.unobserve(onNodesChange);
      connectionsMap.unobserve(onConnectionsChange);
      provider.awareness.off("change", onAwarenessChange);
      provider.off("status", onStatus);
      provider.awareness.setLocalState(null);
      unsubStore();
      entryRef.current = null;
      releaseProvider(workspaceId);
      setReady(false);
      setPeers([]);
      setSignalingConnected(false);
      setGraceExpired(false);
    };
  }, [workspaceId]);

  const publishCursor: RemoteCursorPublisher = (worldX, worldY) => {
    const entry = entryRef.current;
    if (!entry) return;
    entry.provider.awareness.setLocalStateField("cursor", {
      x: worldX,
      y: worldY,
    });
  };

  const status: RealtimeStatus = !workspaceId
    ? "offline"
    : peers.length > 0
      ? "live"
      : !graceExpired
        ? "connecting"
        : signalingConnected
          ? "solo"
          : "offline";

  return { ready, self, peers, publishCursor, status };
}

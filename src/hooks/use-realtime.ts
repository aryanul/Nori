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
import type { CanvasNode, Connection, NodeThread } from "@/types/canvas";
import type { PeerState, UserIdentity } from "@/types/realtime";

type RemoteCursorPublisher = (worldX: number, worldY: number) => void;

export type RealtimeStatus =
  | "connecting"
  | "live"
  | "solo"
  | "offline"
  | "unauthorized";

type UseRealtimeResult = {
  ready: boolean;
  self: UserIdentity | null;
  peers: PeerState[];
  publishCursor: RemoteCursorPublisher;
  status: RealtimeStatus;
  undo: () => void;
  redo: () => void;
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

async function fetchRealtimeToken(
  workspaceId: string,
): Promise<string | null> {
  try {
    const res = await fetch(
      `/api/realtime-token?workspace=${encodeURIComponent(workspaceId)}`,
      { cache: "no-store" },
    );
    if (!res.ok) {
      console.warn(
        `[Nori realtime] token fetch failed: ${res.status} ${res.statusText}`,
      );
      return null;
    }
    const data = (await res.json()) as { token?: string };
    return data.token ?? null;
  } catch (err) {
    console.warn("[Nori realtime] token fetch error:", err);
    return null;
  }
}

export function useRealtime(workspaceId: string | null): UseRealtimeResult {
  const [self, setSelf] = useState<UserIdentity | null>(null);
  const [peers, setPeers] = useState<PeerState[]>([]);
  const [ready, setReady] = useState(false);
  const [signalingConnected, setSignalingConnected] = useState(false);
  const [graceExpired, setGraceExpired] = useState(false);
  const [authFailed, setAuthFailed] = useState(false);
  const entryRef = useRef<RealtimeEntry | null>(null);
  const applyingRemoteRef = useRef(false);
  const undoManagerRef = useRef<Y.UndoManager | null>(null);

  useEffect(() => {
    if (!workspaceId) return;
    setAuthFailed(false);

    const identity = getOrCreateUserIdentity();
    setSelf(identity);

    let cancelled = false;
    let teardown: (() => void) | null = null;
    const graceTimer = window.setTimeout(() => {
      if (!cancelled) setGraceExpired(true);
    }, 4000);

    (async () => {
      const token = await fetchRealtimeToken(workspaceId);
      if (cancelled) return;
      if (!token) {
        setAuthFailed(true);
        return;
      }

      const entry = acquireProvider(workspaceId, token);
      entryRef.current = entry;
      const { doc, provider, nodesMap, connectionsMap, threadsMap } = entry;
      const awareness = provider.awareness;
      if (!awareness) {
        console.warn("[Nori realtime] provider awareness is null");
        return;
      }

      // Per-user undo stack. We only track operations our client originated
      // (LOCAL_ORIGIN) — so Ctrl+Z reverses MY edits, not someone else's.
      const undoManager = new Y.UndoManager(
        [nodesMap, connectionsMap, threadsMap],
        {
          trackedOrigins: new Set([LOCAL_ORIGIN]),
          captureTimeout: 350,
        },
      );
      undoManagerRef.current = undoManager;

      // 1. Seed Y.Maps from current Zustand state — only if empty
      const currentState = useCanvasStore.getState();
      if (
        nodesMap.size === 0 &&
        connectionsMap.size === 0 &&
        threadsMap.size === 0
      ) {
        doc.transact(() => {
          for (const node of Object.values(currentState.nodes)) {
            nodesMap.set(node.id, node);
          }
          for (const conn of Object.values(currentState.connections)) {
            connectionsMap.set(conn.id, conn);
          }
          for (const thread of Object.values(currentState.threads)) {
            threadsMap.set(thread.id, thread);
          }
        }, LOCAL_ORIGIN);
      } else {
        applyingRemoteRef.current = true;
        useCanvasStore
          .getState()
          .replaceCanvasState(
            ymapToObject<CanvasNode>(nodesMap),
            ymapToObject<Connection>(connectionsMap),
            ymapToObject<NodeThread>(threadsMap),
          );
        applyingRemoteRef.current = false;
      }

      const onNodesChange = (
        _event: Y.YMapEvent<CanvasNode>,
        transaction: Y.Transaction,
      ) => {
        if (transaction.origin === LOCAL_ORIGIN) return;
        applyingRemoteRef.current = true;
        useCanvasStore
          .getState()
          .replaceNodes(ymapToObject<CanvasNode>(nodesMap));
        applyingRemoteRef.current = false;
      };
      const onConnectionsChange = (
        _event: Y.YMapEvent<Connection>,
        transaction: Y.Transaction,
      ) => {
        if (transaction.origin === LOCAL_ORIGIN) return;
        applyingRemoteRef.current = true;
        useCanvasStore
          .getState()
          .replaceConnections(ymapToObject<Connection>(connectionsMap));
        applyingRemoteRef.current = false;
      };
      const onThreadsChange = (
        _event: Y.YMapEvent<NodeThread>,
        transaction: Y.Transaction,
      ) => {
        if (transaction.origin === LOCAL_ORIGIN) return;
        applyingRemoteRef.current = true;
        useCanvasStore
          .getState()
          .replaceThreads(ymapToObject<NodeThread>(threadsMap));
        applyingRemoteRef.current = false;
      };
      nodesMap.observe(onNodesChange);
      connectionsMap.observe(onConnectionsChange);
      threadsMap.observe(onThreadsChange);

      let lastNodes = useCanvasStore.getState().nodes;
      let lastConnections = useCanvasStore.getState().connections;
      let lastThreads = useCanvasStore.getState().threads;
      const unsubStore = useCanvasStore.subscribe((state) => {
        if (
          state.nodes === lastNodes &&
          state.connections === lastConnections &&
          state.threads === lastThreads
        ) {
          return;
        }
        const changedNodes = state.nodes !== lastNodes;
        const changedConnections = state.connections !== lastConnections;
        const changedThreads = state.threads !== lastThreads;
        lastNodes = state.nodes;
        lastConnections = state.connections;
        lastThreads = state.threads;
        if (applyingRemoteRef.current) return;
        doc.transact(() => {
          if (changedNodes) syncObjectToYMap(nodesMap, state.nodes);
          if (changedConnections)
            syncObjectToYMap(connectionsMap, state.connections);
          if (changedThreads) syncObjectToYMap(threadsMap, state.threads);
        }, LOCAL_ORIGIN);
      });

      awareness.setLocalState({ user: identity, cursor: null });

      const onAwarenessChange = () => {
        const states = awareness.getStates();
        const list: PeerState[] = [];
        states.forEach((value, clientId) => {
          if (clientId === awareness.clientID) return;
          const v = value as {
            user?: UserIdentity;
            cursor?: { x: number; y: number } | null;
          };
          if (!v.user) return;
          list.push({ clientId, user: v.user, cursor: v.cursor ?? null });
        });
        setPeers(list);
      };
      awareness.on("change", onAwarenessChange);
      onAwarenessChange();

      const onStatus = (e: { status: string }) => {
        setSignalingConnected(e.status === "connected");
      };
      provider.on("status", onStatus);

      // If the server rejects the connection (e.g. expired/invalid token),
      // surface it as unauthorized so the UI shows an actionable state.
      const onAuthFailure = () => {
        console.warn("[Nori realtime] server rejected our token");
        setAuthFailed(true);
      };
      provider.on("authenticationFailed", onAuthFailure);

      setReady(true);

      teardown = () => {
        undoManager.destroy();
        undoManagerRef.current = null;
        nodesMap.unobserve(onNodesChange);
        connectionsMap.unobserve(onConnectionsChange);
        threadsMap.unobserve(onThreadsChange);
        awareness.off("change", onAwarenessChange);
        provider.off("status", onStatus);
        provider.off("authenticationFailed", onAuthFailure);
        awareness.setLocalState(null);
        unsubStore();
        entryRef.current = null;
        releaseProvider(workspaceId);
      };
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(graceTimer);
      if (teardown) teardown();
      setReady(false);
      setPeers([]);
      setSignalingConnected(false);
      setGraceExpired(false);
    };
  }, [workspaceId]);

  const publishCursor: RemoteCursorPublisher = (worldX, worldY) => {
    const entry = entryRef.current;
    if (!entry || !entry.provider.awareness) return;
    entry.provider.awareness.setLocalStateField("cursor", {
      x: worldX,
      y: worldY,
    });
  };

  const undo = () => undoManagerRef.current?.undo();
  const redo = () => undoManagerRef.current?.redo();

  const status: RealtimeStatus = !workspaceId
    ? "offline"
    : authFailed
      ? "unauthorized"
      : peers.length > 0
        ? "live"
        : !graceExpired
          ? "connecting"
          : signalingConnected
            ? "solo"
            : "offline";

  return { ready, self, peers, publishCursor, status, undo, redo };
}

"use client";

import { useEffect } from "react";
import { useCanvasStore, type Tool } from "@/store/canvas-store";

type Props = {
  onUndo: () => void;
  onRedo: () => void;
};

/**
 * Global keyboard shortcuts for the workspace. Single window-level keydown
 * listener — anything keyboard-related routes through here so listeners
 * can't compete.
 */
export function WorkspaceHotkeys({ onUndo, onRedo }: Props) {
  const setActiveTool = useCanvasStore((s) => s.setActiveTool);
  const selectAllNodes = useCanvasStore((s) => s.selectAllNodes);
  const clearSelection = useCanvasStore((s) => s.clearSelection);
  const toggleShortcuts = useCanvasStore((s) => s.toggleShortcuts);
  const toggleCommandPalette = useCanvasStore((s) => s.toggleCommandPalette);
  const setShortcutsOpen = useCanvasStore((s) => s.setShortcutsOpen);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement | null)?.tagName;
      const inField = tag === "INPUT" || tag === "TEXTAREA";

      const cmd = e.metaKey || e.ctrlKey;

      // Undo / Redo — work even while typing in node text fields.
      if (cmd && !e.shiftKey && (e.key === "z" || e.key === "Z")) {
        e.preventDefault();
        onUndo();
        return;
      }
      if (
        (cmd && e.shiftKey && (e.key === "z" || e.key === "Z")) ||
        (cmd && (e.key === "y" || e.key === "Y"))
      ) {
        e.preventDefault();
        onRedo();
        return;
      }

      // Below this point we don't want to hijack typing. The `?` shortcut
      // is intentionally bound AFTER this check so users can still type a
      // literal "?" inside a node.
      if (inField) return;

      // Shortcuts overlay toggle — `?` (which most keyboards produce as
      // Shift+/). Match `key` directly and use `code` as a layout fallback.
      const isQuestion =
        e.key === "?" ||
        (e.shiftKey && (e.key === "/" || e.code === "Slash"));
      if (isQuestion) {
        e.preventDefault();
        toggleShortcuts();
        return;
      }

      if (cmd && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        toggleCommandPalette();
        return;
      }
      if (cmd && (e.key === "a" || e.key === "A")) {
        e.preventDefault();
        selectAllNodes();
        return;
      }

      if (e.key === "Escape") {
        // Close the help overlay first if it's open; otherwise clear
        // canvas selection.
        const state = useCanvasStore.getState();
        if (state.shortcutsOpen) {
          setShortcutsOpen(false);
        } else {
          clearSelection();
          setActiveTool("select");
        }
        return;
      }

      // "M" opens (or focuses) the thread panel for the single selected node.
      if (!cmd && !e.altKey && !e.shiftKey && (e.key === "m" || e.key === "M")) {
        const state = useCanvasStore.getState();
        if (state.selectedNodeIds.length === 1) {
          e.preventDefault();
          state.openThreadFor(state.selectedNodeIds[0]);
          return;
        }
      }

      // Tool switching — bare letters, no modifiers.
      if (!cmd && !e.altKey && !e.shiftKey) {
        const map: Record<string, Tool> = {
          v: "select",
          c: "card",
          s: "sticky",
          f: "frame",
          i: "image",
          l: "link",
          d: "draw",
        };
        const next = map[e.key.toLowerCase()];
        if (next) {
          e.preventDefault();
          setActiveTool(next);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    onUndo,
    onRedo,
    setActiveTool,
    selectAllNodes,
    clearSelection,
    toggleShortcuts,
    setShortcutsOpen,
    toggleCommandPalette,
  ]);

  return null;
}

"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useCanvasStore } from "@/store/canvas-store";
import { useOsModifier } from "@/hooks/use-os-modifier";

function buildSections(mod: "⌘" | "Ctrl"): Array<{
  title: string;
  items: Array<{ keys: string[]; label: string }>;
}> {
  return [
    {
      title: "Tools",
      items: [
        { keys: ["V"], label: "Select tool (default)" },
        { keys: ["C"], label: "Card tool — text + body" },
        { keys: ["S"], label: "Sticky tool — body-only post-it" },
        { keys: ["F"], label: "Frame tool — grouping region" },
        { keys: ["I"], label: "Image tool — file upload" },
        { keys: ["L"], label: "Link tool — URL with preview" },
      ],
    },
    {
      title: "Selection",
      items: [
        { keys: ["Click"], label: "Select a node or connection" },
        { keys: ["Shift", "Click"], label: "Toggle a node in selection" },
        { keys: ["Shift", "Drag"], label: "Box-select multiple nodes" },
        { keys: [mod, "A"], label: "Select all nodes" },
        { keys: ["Esc"], label: "Clear selection" },
      ],
    },
    {
      title: "Editing",
      items: [
        { keys: ["Double-click"], label: "Create a node at cursor" },
        { keys: ["Drag"], label: "Move selection (single or multiple)" },
        { keys: ["Drag handle"], label: "Connect nodes" },
        { keys: ["Delete"], label: "Remove selection" },
        { keys: [mod, "Z"], label: "Undo" },
        { keys: [mod, "⇧", "Z"], label: "Redo" },
      ],
    },
    {
      title: "Canvas",
      items: [
        { keys: [mod, "K"], label: "Open command palette" },
        { keys: ["Drag empty"], label: "Pan the canvas" },
        { keys: ["Scroll"], label: "Zoom toward cursor" },
        { keys: ["?"], label: "Toggle this overlay" },
      ],
    },
  ];
}

export function ShortcutsHelp() {
  // State and keydown handling now live in WorkspaceHotkeys + the store —
  // ShortcutsHelp is a pure consumer.
  const open = useCanvasStore((s) => s.shortcutsOpen);
  const setShortcutsOpen = useCanvasStore((s) => s.setShortcutsOpen);
  const mod = useOsModifier();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;
  const sections = buildSections(mod.symbol);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="shortcuts-backdrop"
          onPointerDown={() => setShortcutsOpen(false)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="pointer-events-auto fixed inset-0 z-[120] flex items-center justify-center bg-black/55 backdrop-blur-md"
        >
          <motion.div
            onPointerDown={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 14, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-[#0a0b10]/95 p-6 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)] backdrop-blur-xl"
          >
            <span className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

            <header className="mb-5 flex items-baseline justify-between">
              <h2 className="text-base font-medium tracking-tight text-white">
                Keyboard shortcuts
              </h2>
              <span className="text-[10px] uppercase tracking-[0.25em] text-white/35">
                press ? to toggle
              </span>
            </header>

            <div className="grid grid-cols-1 gap-x-8 gap-y-5 md:grid-cols-2">
              {sections.map((section) => (
                <section key={section.title}>
                  <h3 className="mb-2 text-[10px] font-medium uppercase tracking-[0.22em] text-white/45">
                    {section.title}
                  </h3>
                  <ul className="space-y-1.5">
                    {section.items.map((item, i) => (
                      <li
                        key={i}
                        className="flex items-center justify-between gap-3 text-xs"
                      >
                        <span className="text-white/70">{item.label}</span>
                        <span className="flex shrink-0 items-center gap-1">
                          {item.keys.map((k, j) => (
                            <kbd
                              key={j}
                              className="rounded-[5px] border border-white/12 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[10px] text-white/65"
                            >
                              {k}
                            </kbd>
                          ))}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { updateWorkspaceTitle } from "@/lib/actions/workspace";
import { cn } from "@/lib/cn";

type Props = {
  workspaceId: string;
  initialTitle: string;
  editable: boolean;
};

export function EditableTitle({ workspaceId, initialTitle, editable }: Props) {
  const [title, setTitle] = useState(initialTitle);
  const [draft, setDraft] = useState(initialTitle);
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTitle(initialTitle);
    setDraft(initialTitle);
  }, [initialTitle]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const commit = () => {
    const next = draft.trim();
    if (!next || next === title) {
      setDraft(title);
      setEditing(false);
      return;
    }
    const previous = title;
    setTitle(next);
    setEditing(false);
    startTransition(async () => {
      const res = await updateWorkspaceTitle(workspaceId, next);
      if (!res.ok) {
        setTitle(previous);
        setDraft(previous);
        console.warn("[EditableTitle] save failed:", res.error);
      }
    });
  };

  const cancel = () => {
    setDraft(title);
    setEditing(false);
  };

  if (!editable) {
    return (
      <span className="max-w-[200px] truncate text-white/60">{title}</span>
    );
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setDraft(title);
          setEditing(true);
        }}
        title="Rename workspace"
        className={cn(
          "max-w-[200px] truncate text-left text-white/60 transition-colors hover:text-white",
          pending && "opacity-70",
        )}
      >
        {title}
      </button>
    );
  }

  return (
    <input
      ref={inputRef}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
        } else if (e.key === "Escape") {
          e.preventDefault();
          cancel();
        }
      }}
      maxLength={80}
      spellCheck={false}
      className="w-[220px] border-b border-white/30 bg-transparent text-white outline-none placeholder:text-white/30"
    />
  );
}

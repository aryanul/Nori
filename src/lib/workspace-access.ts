import mongoose from "mongoose";

type AccessDoc = {
  ownerId?: unknown;
  members?: unknown[];
  viewers?: unknown[];
};

function matchesObjectId(
  value: unknown,
  target: mongoose.Types.ObjectId,
): boolean {
  if (value == null) return false;
  if (!mongoose.isValidObjectId(value)) return false;
  try {
    return new mongoose.Types.ObjectId(
      value as string | mongoose.Types.ObjectId,
    ).equals(target);
  } catch {
    return false;
  }
}

function listContains(
  list: unknown[] | undefined,
  target: mongoose.Types.ObjectId,
): boolean {
  if (!Array.isArray(list)) return false;
  for (const v of list) {
    if (matchesObjectId(v, target)) return true;
  }
  return false;
}

/**
 * True when `userId` can READ the workspace.
 *
 * Rules:
 *   - Legacy null-owner workspaces (created before auth) are accessible to
 *     any signed-in user until a migration assigns them an owner.
 *   - Owner always has access.
 *   - Anyone in `members[]` (editors) has access.
 *   - Anyone in `viewers[]` (read-only) has access.
 */
export function userCanAccessWorkspace(
  doc: AccessDoc,
  userId: mongoose.Types.ObjectId,
): boolean {
  if (doc.ownerId == null) return true;
  if (matchesObjectId(doc.ownerId, userId)) return true;
  if (listContains(doc.members, userId)) return true;
  if (listContains(doc.viewers, userId)) return true;
  return false;
}

/**
 * True when `userId` can WRITE to the workspace.
 *
 * Viewers can read but not edit — they're explicitly excluded here. Server-
 * side this is enforced by `saveWorkspace` and by Hocuspocus returning
 * `readOnly: true` for viewer connections.
 */
export function userCanEditWorkspace(
  doc: AccessDoc,
  userId: mongoose.Types.ObjectId,
): boolean {
  if (doc.ownerId == null) return true;
  if (matchesObjectId(doc.ownerId, userId)) return true;
  if (listContains(doc.members, userId)) return true;
  return false;
}

export function userOwnsWorkspace(
  doc: AccessDoc,
  userId: mongoose.Types.ObjectId,
): boolean {
  return matchesObjectId(doc.ownerId, userId);
}

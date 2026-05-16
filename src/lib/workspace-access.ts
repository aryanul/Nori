import mongoose from "mongoose";

type OwnedDoc = {
  ownerId?: unknown;
  members?: unknown[];
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

/**
 * True when `userId` can read/write the given workspace.
 *
 * Rules:
 *   - Legacy null-owner workspaces (created before auth) are accessible to any
 *     signed-in user until a migration assigns them an owner.
 *   - Owner always has access.
 *   - Anyone listed in `members[]` has access.
 *
 * Used by every access checkpoint — `getWorkspace`, `saveWorkspace`,
 * `/api/realtime-token`, and Hocuspocus's `onAuthenticate`. Keeping the logic
 * here means those four can't drift out of sync.
 */
export function userCanAccessWorkspace(
  doc: OwnedDoc,
  userId: mongoose.Types.ObjectId,
): boolean {
  if (doc.ownerId == null) return true;
  if (matchesObjectId(doc.ownerId, userId)) return true;
  if (Array.isArray(doc.members)) {
    for (const m of doc.members) {
      if (matchesObjectId(m, userId)) return true;
    }
  }
  return false;
}

export function userOwnsWorkspace(
  doc: OwnedDoc,
  userId: mongoose.Types.ObjectId,
): boolean {
  return matchesObjectId(doc.ownerId, userId);
}

import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const ActivitySchema = new Schema(
  {
    _id: { type: String, required: true },
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },
    kind: {
      type: String,
      enum: [
        "node_created",
        "node_deleted",
        "node_edited",
        "thread_message_added",
        "thread_resolved",
      ],
      required: true,
    },
    actorId: { type: String, required: true },
    actorName: { type: String, default: "" },
    actorColor: { type: String, default: "#7ad7ff" },
    targetNodeId: { type: String, default: null },
    targetLabel: { type: String, default: null },
    targetNodeKind: { type: String, default: null },
    // ISO string — keeping it as a string so it round-trips identically
    // through Yjs / Mongo without timezone drift.
    createdAt: { type: String, required: true, index: true },
  },
  { _id: false },
);

export type ActivityDoc = InferSchemaType<typeof ActivitySchema>;

export const ActivityModel: Model<ActivityDoc> =
  (mongoose.models.Activity as Model<ActivityDoc>) ||
  mongoose.model<ActivityDoc>("Activity", ActivitySchema);

import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const MessageSchema = new Schema(
  {
    id: { type: String, required: true },
    authorId: { type: String, required: true },
    authorName: { type: String, default: "" },
    authorColor: { type: String, default: "#7ad7ff" },
    body: { type: String, required: true },
    createdAt: { type: String, required: true },
  },
  { _id: false },
);

const ThreadSchema = new Schema(
  {
    _id: { type: String, required: true },
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },
    nodeId: { type: String, required: true, index: true },
    messages: { type: [MessageSchema], default: [] },
    resolved: { type: Boolean, default: false },
  },
  { timestamps: true, _id: false },
);

export type ThreadDoc = InferSchemaType<typeof ThreadSchema> & {
  createdAt: Date;
  updatedAt: Date;
};

export const ThreadModel: Model<ThreadDoc> =
  (mongoose.models.Thread as Model<ThreadDoc>) ||
  mongoose.model<ThreadDoc>("Thread", ThreadSchema);

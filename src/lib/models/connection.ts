import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const ConnectionSchema = new Schema(
  {
    _id: { type: String, required: true },
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },
    fromNodeId: { type: String, required: true },
    toNodeId: { type: String, required: true },
  },
  { timestamps: true, _id: false },
);

export type ConnectionDoc = InferSchemaType<typeof ConnectionSchema> & {
  createdAt: Date;
  updatedAt: Date;
};

export const ConnectionModel: Model<ConnectionDoc> =
  (mongoose.models.Connection as Model<ConnectionDoc>) ||
  mongoose.model<ConnectionDoc>("Connection", ConnectionSchema);

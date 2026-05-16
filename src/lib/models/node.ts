import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const NodeSchema = new Schema(
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
      enum: ["card", "sticky", "frame"],
      required: true,
      default: "card",
    },
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    title: { type: String, default: "" },
    body: { type: String, default: "" },
    color: { type: String, default: null },
  },
  { timestamps: true, _id: false },
);

export type NodeDoc = InferSchemaType<typeof NodeSchema> & {
  createdAt: Date;
  updatedAt: Date;
};

export const NodeModel: Model<NodeDoc> =
  (mongoose.models.Node as Model<NodeDoc>) ||
  mongoose.model<NodeDoc>("Node", NodeSchema);

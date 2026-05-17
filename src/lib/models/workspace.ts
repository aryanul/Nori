import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const WorkspaceSchema = new Schema(
  {
    title: { type: String, required: true, default: "Untitled workspace" },
    ownerId: {
      type: Schema.Types.ObjectId,
      default: null,
      index: true,
    },
    members: { type: [Schema.Types.ObjectId], default: [], index: true },
    viewers: { type: [Schema.Types.ObjectId], default: [], index: true },
    inviteToken: { type: String, default: null, index: true },
    viewToken: { type: String, default: null, index: true },
    settings: {
      theme: { type: String, default: "glass" },
      background: { type: String, default: "gradient" },
    },
  },
  { timestamps: true },
);

export type WorkspaceDoc = InferSchemaType<typeof WorkspaceSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const Workspace: Model<WorkspaceDoc> =
  (mongoose.models.Workspace as Model<WorkspaceDoc>) ||
  mongoose.model<WorkspaceDoc>("Workspace", WorkspaceSchema);

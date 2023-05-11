import mongoose, { Schema } from "mongoose";

const UserGroupModel = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    status: {
      type: String,
      enum: ["0", "1", "2"],
      default: "0",
    },
    workflowState: {
      type: String,
      required: true,
      default: "Draft",
    },
    createdBy: {
      _id: {
        type: Schema.Types.ObjectId,
        required: true,
      },
      name: { type: String },
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("usergroup", UserGroupModel);

UserGroupModel.index({ name: 1, status: 1, workflowState: 1 });

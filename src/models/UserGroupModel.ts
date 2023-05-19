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
      type: Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

UserGroupModel.index({ name: 1, status: 1, workflowState: 1, createdBy: 1 });

export default mongoose.model("usergroup", UserGroupModel);

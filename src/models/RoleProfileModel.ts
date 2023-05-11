import mongoose, { Schema } from "mongoose";

const RoleProfile = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      index: true,
      unique: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "Users",
      required: true,
      index: true,
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
  },
  {
    timestamps: true,
  }
);

RoleProfile.index({ name: 1, status: 1, workflowState: 1 });


export default mongoose.model("RoleProfiles", RoleProfile);


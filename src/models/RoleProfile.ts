import mongoose, { Schema } from "mongoose";

const RoleProfile = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      index: true,
      unique: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "Users",
      required: true,
      index: true,
    },
    branch: {
      type: Schema.Types.ObjectId,
      ref: "branch",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["0", "1", "2", "3"],
      default: "0",
    },
    workflowState: {
      type: String,
      required:true,
      default:"Draft"
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("RoleProfiles", RoleProfile);

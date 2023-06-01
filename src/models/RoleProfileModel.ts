import mongoose, { Schema } from "mongoose";

const RoleProfile = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      index: 1,
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
      index: true,
    },
    workflowState: {
      type: String,
      required: true,
      default: "Draft",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

RoleProfile.index({
  createdAt: -1,
});
RoleProfile.index({
  updatedAt: -1,
});

export default mongoose.model("RoleProfiles", RoleProfile);

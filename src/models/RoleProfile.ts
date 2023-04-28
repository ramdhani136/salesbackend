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
    workflowState: {
      type: String,
      require: true,
      index: true,
      default:"Draft"
    },
    status: {
      type: String,
      required: true,
      default: 0,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("RoleProfiles", RoleProfile);

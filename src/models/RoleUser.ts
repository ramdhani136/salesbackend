import mongoose, { Schema } from "mongoose";

const RolUser = new mongoose.Schema(
  {
    roleprofile: {
      type: Schema.Types.ObjectId,
      ref: "RoleProfiles",
      required: true,
      index: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "Users",
      required: true,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "Users",
      required: true,
      index: true,
    },
    uniqId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("RolUser", RolUser);

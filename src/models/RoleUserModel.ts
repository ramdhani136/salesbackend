import mongoose, { Schema } from "mongoose";

const RoleUserModel = new mongoose.Schema(
  {
    roleprofile: {
      type: Schema.Types.ObjectId,
      ref: "RoleProfiles",
      required: true,
      index: 1,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "Users",
      required: true,
      index: 1,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "Users",
      required: true,
      index: 1,
    },
    status: {
      type: String,
      enum: ["0", "1", "2"],
      default: "1",
      index: 1,
    },
    workflowState: {
      type: String,
      required:true,
      default:"Submitted",
      index: 1,
    },
  },
  {
    timestamps: true,
  }
);

RoleUserModel.index({
  createdAt: -1,
});
RoleUserModel.index({
  updatedAt: -1,
});



export default mongoose.model("RoleUser", RoleUserModel);


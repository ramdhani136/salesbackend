import mongoose, { Schema } from "mongoose";

const UserGroupModel = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      index: 1,
    },
    status: {
      type: String,
      enum: ["0", "1", "2"],
      default: "0",
      index: 1,
    },
    workflowState: {
      type: String,
      required: true,
      default: "Draft",
      index: 1,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "Users",
      required: true,
      index: 1,
    },
  },
  {
    timestamps: true,
  }
);

UserGroupModel.index({
  createdAt: -1,
});
UserGroupModel.index({
  updatedAt: -1,
});

export default mongoose.model("usergroup", UserGroupModel);

import mongoose, { Schema } from "mongoose";

const UserGroupListModel = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    user: {
      _id: {
        type: Schema.Types.ObjectId,
        required: true,
      },
      name: { type: String, required: true },
    },
    userGroup: {
      _id: {
        type: Schema.Types.ObjectId,
        required: true,
      },
      name: { type: String, required: true },
    },
    createdBy: {
      _id: {
        type: Schema.Types.ObjectId,
        required: true,
      },
      name: { type: String, required: true },
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("usergroup", UserGroupListModel);

UserGroupListModel.index({ name: 1, status: 1, workflowState: 1 });

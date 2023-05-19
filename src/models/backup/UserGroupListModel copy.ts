import mongoose, { Schema } from "mongoose";

const UserGroupListModel = new mongoose.Schema(
  {
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


UserGroupListModel.index({ name: 1, status: 1, workflowState: 1 });


export default mongoose.model("usergrouplist", UserGroupListModel);

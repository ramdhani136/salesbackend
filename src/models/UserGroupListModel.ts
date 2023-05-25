import mongoose, { Schema } from "mongoose";

const UserGroupListModel = new mongoose.Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "Users",
      required: true,
      index: true,
    },
    userGroup: {
      type: Schema.Types.ObjectId,
      ref: "usergroup",
      required: true,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "Users",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

UserGroupListModel.index({
  createdAt: -1,
});
UserGroupListModel.index({
  updatedAt: -1,
});

export default mongoose.model("usergrouplist", UserGroupListModel);

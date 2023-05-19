import mongoose, { Schema } from "mongoose";

const UserGroupListModel = new mongoose.Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    },
    userGroup: {
      type: Schema.Types.ObjectId,
      ref: "usergroup",
      required: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

UserGroupListModel.index({
  user: 1,
  userGroup: 1,
  createdBy: 1,
});

export default mongoose.model("usergrouplist", UserGroupListModel);

import mongoose, { Schema } from "mongoose";

const RoleListModel = new mongoose.Schema(
  {
    roleprofile: {
      type: Schema.Types.ObjectId,
      ref: "RoleProfiles",
      required: true,
      index: 1,
    },
    doc: {
      type: String,
      enum: [
        "users",
        "branch",
        "permission",
        "customer",
        "customergroup",
        "visit",
        "callsheet",
        "contact",
        "namingseries",
        "usergroup",
        "usergrouplist",
        "schedule",
        "schedulelist",
        "roleprofile",
        "rolelist",
        "roleuser",
        "tag",
        "visitnote",
        "callsheetnote",
        "memo",
      ],
      require: true,
      index: 1,
    },
    create: {
      type: String,
      enum: [0, 1],
      default: 0,
      index: 1,
    },
    read: {
      type: String,
      enum: [0, 1],
      default: 1,
      index: 1,
    },
    delete: {
      type: String,
      enum: [0, 1],
      default: 0,
      index: 1,
    },
    update: {
      type: String,
      enum: [0, 1],
      default: 0,
      index: 1,
    },
    amend: {
      type: String,
      enum: [0, 1],
      default: 0,
      index: 1,
    },
    submit: {
      type: String,
      enum: [0, 1],
      default: 0,
      index: 1,
    },
    report: {
      type: String,
      enum: [0, 1],
      default: 0,
      index: 1,
    },
    export: {
      type: String,
      enum: [0, 1],
      default: 0,
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

RoleListModel.index({
  createdAt: -1,
});
RoleListModel.index({
  updatedAt: -1,
});

export default mongoose.model("RoleLists", RoleListModel);

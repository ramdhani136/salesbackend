import mongoose, { Schema } from "mongoose";

const RoleListModel = new mongoose.Schema(
  {
    roleprofile: {
      type: Schema.Types.ObjectId,
      ref: "RoleProfiles",
      required: true,
      index: true,
    },
    doc: {
      type: String,
      require: true,
      index: true,
    },
    create: {
      type: String,
      required: true,
      default: 0,
      index: true,
    },
    read: {
      type: String,
      required: true,
      default: 1,
      index: true,
    },
    delete: {
      type: String,
      required: true,
      default: 0,
      index: true,
    },
    update: {
      type: String,
      required: true,
      default: 0,
      index: true,
    },
    amend: {
      type: String,
      required: true,
      default: 0,
      index: true,
    },
    submit: {
      type: String,
      required: true,
      default: 0,
      index: true,
    },
    report: {
      type: String,
      required: true,
      default: 0,
      index: true,
    },
    export: {
      type: String,
      required: true,
      default: 0,
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

export default mongoose.model("RoleLists", RoleListModel);

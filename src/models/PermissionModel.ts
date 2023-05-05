import mongoose, { Schema } from "mongoose";

const Permission = new mongoose.Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "Users",
      required: true,
      index: true,
    },
    allow: {
      type: String,
      enum: ["branch", "user", "customer", "customerGroup", "userGroup"],
      require: true,
      index: true,
    },
    doc: {
      type: String,
      enum: ["branch", "visit", "callsheet", ""],
      default: "",
      index: true,
    },
    allDoc: {
      type: Boolean,
      index: true,
      enum: [0, 1],
      default: 0,
    },
    value: {
      type: String,
      require: true,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "Users",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["0", "1", "2"],
      default: "1",
    },
    workflowState: {
      type: String,
      required: true,
      default: "Submited",
    },
  },
  {
    timestamps: true,
  }
);

Permission.index({ user: 1, createdBy: 1 });

export default mongoose.model("Permissions", Permission);
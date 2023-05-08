import mongoose, { Schema } from "mongoose";

const CustomerGroupModel = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    desc: {
      type: String,
    },
    parent: {
      _id: { type: Schema.Types.ObjectId, default: "" },
      name: { type: String, default: "" },
    },
    branch: {
      type: Schema.Types.ObjectId,
      ref: "branch",
      required: true,
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
      index: true,
    },
    workflowState: {
      type: String,
      required: true,
      default: "Submitted",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("customergroup", CustomerGroupModel);

CustomerGroupModel.index({ name: 1, status: 1, parent: 1, workflowState: 1 });

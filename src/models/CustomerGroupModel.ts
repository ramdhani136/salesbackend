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
      type: String,
      default: null,
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

export default mongoose.model("customerGroup", CustomerGroupModel);

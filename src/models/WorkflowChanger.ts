import mongoose, { Schema } from "mongoose";

const WorkflowChanger = new mongoose.Schema(
  {
    workflow: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
      ref: "workflows",
    },

    state: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
      ref: "workflowStates",
    },
    roleprofile: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
      ref: "roleprofiles",
    },
    status: {
      type: Number,
      required: true,
      index: true,
    },
    selfApproval: {
      type: Boolean,
      default: 0,
      index: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
      ref: "Users",
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("workflowChangers", WorkflowChanger);

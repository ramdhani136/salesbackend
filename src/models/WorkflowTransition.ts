import mongoose, { Schema } from "mongoose";

const WorkflowTransition = new mongoose.Schema(
  {
    workflow: {
      type: Schema.Types.ObjectId,
      ref: "workflows",
      required: true,
      index: true,
    },
  
    stateActive: {
      type: Schema.Types.ObjectId,
      ref: "workflowStates",
      required: true,
      index: true,
    },
    action: {
      type: Schema.Types.ObjectId,
      ref: "workflowActions",
      required: true,
      index: true,
    },
    nextState: {
      type: Schema.Types.ObjectId,
      ref: "workflowStates",
      required: true,
      index: true,
    },
    roleprofile: {
      type: Schema.Types.ObjectId,
      ref: "RoleProfiles",
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
      ref: "Users",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("workflowTransitions", WorkflowTransition);

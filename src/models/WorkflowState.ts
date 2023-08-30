import mongoose, { Schema } from "mongoose";

const WorkflowState = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      index: true,
      unique: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
      ref: "Users",
    },
    status: {
      type: String,
      enum: ["0", "1"],
      default: "0",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

WorkflowState.index({
  createdAt: -1,
});
WorkflowState.index({
  updatedAt: -1,
});

export default mongoose.model("workflowStates", WorkflowState);

import mongoose, { Schema } from "mongoose";

const WorkflowAction = new mongoose.Schema(
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
  },
  {
    timestamps: true,
  }
);


WorkflowAction.index({
  createdAt: -1,
});
WorkflowAction.index({
  updatedAt: -1,
});

export default mongoose.model("workflowActions", WorkflowAction);

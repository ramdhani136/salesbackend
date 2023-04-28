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

export default mongoose.model("workflowActions", WorkflowAction);

import mongoose, { Schema } from "mongoose";

const AssesmentResult = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      index: 1,
    },
    customer: {
      _id: {
        type: Schema.Types.ObjectId,
        required: true,
        index: 1,
      },
      name: {
        type: String,
        required: true,
        index: 1,
      }
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    },
    status: {
      type: String,
      enum: ["0", "1", "2", "3"],
      default: "0",
      index: 1,
    },
    workflowState: {
      type: String,
      required: true,
      default: "Draft",
      index: 1,
    },
    score: {
      type: Number,
      required: true,
    },
    grade: {
      type: String,
      required: true,
    },
    detail: [
      { question: { type: String, required: true }, answer: { type: String, required: true } }
    ],
    desc: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

AssesmentResult.index({
  createdAt: -1,
});
AssesmentResult.index({
  updatedAt: -1,
});
AssesmentResult.index({
  name: -1,
});

export default mongoose.model("assesmentresult", AssesmentResult);

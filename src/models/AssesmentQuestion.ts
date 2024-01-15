import mongoose, { Schema } from "mongoose";

const AssesmentQuestion = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      index: 1,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "Users",
      required: true,
      index: 1,
    },
    status: {
      type: String,
      enum: ["0", "1", "2","3"],
      default: "0",
      index: 1,
    },
  },
  {
    timestamps: true,
  }
);

AssesmentQuestion.index({
  createdAt: -1,
});
AssesmentQuestion.index({
  updatedAt: -1,
});
AssesmentQuestion.index({
  name: -1,
});

export default mongoose.model("assesmentquestion", AssesmentQuestion);

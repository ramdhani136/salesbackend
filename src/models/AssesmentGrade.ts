import mongoose, { Schema } from "mongoose";

const AssesmentGrade = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    assesmentTemplateId: {
      type: Schema.Types.ObjectId,
      ref: "assesmenttemplate ",
      required: true,
    },
    condition: {
      type: String,
      enum: [">", ">=", "<", "<=", "="],
      required: true,
    },
    grade: {
      type: String,
      required: true,
    },
    value: {
      type: Number,
      required: true,
    },
    desc: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

AssesmentGrade.index({
  createdAt: -1,
});
AssesmentGrade.index({
  updatedAt: -1,
});

export default mongoose.model("assesmentgrade", AssesmentGrade);

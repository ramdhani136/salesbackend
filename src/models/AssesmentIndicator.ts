import mongoose, { Schema } from "mongoose";

const AssesmentIndicator = new mongoose.Schema(
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
    questionId: {
      type: Schema.Types.ObjectId,
      ref: "assesmentquestion",
      required: true,
    },
    weight: {
      type: Number,
      required:true,
    },
    desc: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

AssesmentIndicator.index({
  createdAt: -1,
});
AssesmentIndicator.index({
  updatedAt: -1,
});
AssesmentIndicator.index({
  name: -1,
});

export default mongoose.model("assesmentindicator", AssesmentIndicator);

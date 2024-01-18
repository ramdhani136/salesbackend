import mongoose, { Schema } from "mongoose";
import AssesmentIndicatorModel from "./AssesmentIndicatorModel";
import AssesmentGradeModel from "./AssesmentGradeModel";

const AssesmentTemplate = new mongoose.Schema(
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
      enum: ["0", "1", "2"],
      default: "0",
      index: 1,
    },
    workflowState: {
      type: String,
      required: true,
      default: "Draft",
      index: 1,
    },
    notes: {
      type: String,
    },
    indicators: {
      type: [AssesmentIndicatorModel],
      required: true,
      validate: {
        validator: function (arr: any) {
          return arr.length > 0; 
        },
        message: "Indicator wajib diisi!",
      },
    },
    grades: {
      type: [AssesmentGradeModel],
      required: true
    }
  },
  {
    timestamps: true,
  }
);

AssesmentTemplate.index({
  createdAt: -1,
});
AssesmentTemplate.index({
  updatedAt: -1,
});
AssesmentTemplate.index({
  name: -1,
});

export default mongoose.model("assesmenttemplate", AssesmentTemplate);

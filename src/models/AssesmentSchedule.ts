import mongoose, { Schema } from "mongoose";

const AssesmentSchedule = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      index: 1,
    },
    activeDate: {
      type: Date,
      required: true,
      index: true,
    },
    deactiveDate: {
      type: Date,
      require: true,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    },
    assesmentTemplate: {
      type: Schema.Types.ObjectId,
      ref: "assesmenttemplate",
      required: true,
    },
    desc: {
      type: String,
      required: true,
    },
    includeNewCustomer: {
      type: Boolean,
      default: 1
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
  },
  {
    timestamps: true,
  }
);

AssesmentSchedule.index({
  createdAt: -1,
});
AssesmentSchedule.index({
  updatedAt: -1,
});
AssesmentSchedule.index({
  name: -1,
});
// AssesmentSchedule.index({
//   activeDate: 1,
//   deactiveDate:1
// });

export default mongoose.model("assesmentschedule", AssesmentSchedule);

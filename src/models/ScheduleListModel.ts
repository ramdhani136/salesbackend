import mongoose, { Schema } from "mongoose";

const ScheduleListModel = new mongoose.Schema(
  {
    schedule: {
      type: Schema.Types.ObjectId,
      ref: "schedule",
      required: true,
    },
    customer: {
      type: Schema.Types.ObjectId,
      ref: "customer",
      required: true,
    },
    customerGroup: {
      type: Schema.Types.ObjectId,
      ref: "customergroup",
      required: true,
    },
    branch: {
      type: Schema.Types.ObjectId,
      ref: "branch",
      required: true,
    },
    notes: {
      type: String,
    },
    status: {
      type: String,
      enum: ["0", "1"],
      default: "0",
    },
    closing: {
      date: {
        type: Date,
      },
      user: {
        _id: {
          type: Schema.Types.ObjectId,
        },
        name: { type: String },
      },
      doc: {
        _id: {
          type: Schema.Types.ObjectId,
        },
        name: { type: String },
      },
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

ScheduleListModel.index({
  schedule: 1,
  status: 1,
  customer: 1,
  workflowState: 1,
  createdBy: 1,
});

export default mongoose.model("schedulelist", ScheduleListModel);

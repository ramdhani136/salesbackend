import mongoose, { Schema } from "mongoose";

const ScheduleListModel = new mongoose.Schema(
  {
    schedule: {
      type: Schema.Types.ObjectId,
      ref: "schedule",
      required: true,
      index: 1,
    },
    customer: {
      type: Schema.Types.ObjectId,
      ref: "customer",
      required: true,
      index: 1,
    },
    notes: {
      type: String,
    },
    status: {
      type: String,
      enum: ["0", "1"],
      default: "0",
      index: 1,
    },
    closing: {
      date: {
        type: Date,
        index: -1,
      },
      user: {
        _id: {
          type: Schema.Types.ObjectId,
          index: 1,
        },
        name: { type: String, index: 1 },
      },
      doc: {
        _id: {
          type: Schema.Types.ObjectId,
          index: 1,
        },
        name: { type: String, index: 1 },
        type: { type: String, index: 1, enum: ["visit", "callsheet"] },
      },
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "Users",
      required: true,
      index: 1,
    },
  },
  {
    timestamps: true,
  }
);

ScheduleListModel.index({
  createdAt: -1,
});
ScheduleListModel.index({
  updatedAt: -1,
});

export default mongoose.model("schedulelist", ScheduleListModel);

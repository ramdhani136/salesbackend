import mongoose, { Schema } from "mongoose";
import ScheduleModel from "./ScheduleModel";

const ScheduleListModel = new mongoose.Schema(
  {
    schedule: ScheduleModel,
    customer: {
      _id: {
        type: Schema.Types.ObjectId,
        required: true,
      },
      name: { type: String, required: true },
      customerGroup: {
        _id: {
          type: Schema.Types.ObjectId,
          required: true,
        },
        name: { type: String, required: true },
        branch: {
          _id: {
            type: Schema.Types.ObjectId,
            required: true,
          },
          name: { type: String, required: true },
        },
      },
    },
    notes: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["0", "1"],
      default: "0",
    },
    createdBy: {
      _id: {
        type: Schema.Types.ObjectId,
        required: true,
      },
      name: { type: String },
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("schedulelist", ScheduleListModel);

ScheduleListModel.index({ name: 1, status: 1, type: 1, workflowState: 1 });

import mongoose, { Schema } from "mongoose";

const Schedule = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    type: {
      type: String,
      required: true,
      enum: ["visit", "callsheet"],
    },
    notes: {
      type: String,
      required: true,
    },
    userGroup: {
      _id: {
        type: Schema.Types.ObjectId,
        required: true,
      },
      name: {
        type: String,
        required: true,
      },
    },
    activeDate: {
      type: Date,
      required: true,
    },
    closingDate: {
      type: Date,
      require: true,
    },
    status: {
      type: String,
      enum: ["0", "1", "2"],
      default: "0",
    },
    workflowState: {
      type: String,
      required: true,
      default: "Draft",
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

export default mongoose.model("Schedules", Schedule);

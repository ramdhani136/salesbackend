import mongoose, { Schema } from "mongoose";

const SchemaScheduleModel = {
  name: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  type: {
    type: String,
    required: true,
    enum: ["visit", "callsheet","all"],
    index: true,
  },
  notes: {
    type: String,
    required: true,
  },
  activeDate: {
    type: Date,
    required: true,
    index: true,
  },
  closingDate: {
    type: Date,
    require: true,
    index: true,
  },
  status: {
    type: String,
    enum: ["0", "1", "2","3"],
    default: "0",
    index: true,
  },
  workflowState: {
    type: String,
    required: true,
    default: "Draft",
    index: true,
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: "Users",
    required: true,
    index: true,
  },
};

const ScheduleModel = new mongoose.Schema(SchemaScheduleModel, {
  timestamps: true,
});

ScheduleModel.index({
  createdAt: -1,
});
ScheduleModel.index({
  updatedAt: -1,
});

export default mongoose.model("schedule", ScheduleModel);

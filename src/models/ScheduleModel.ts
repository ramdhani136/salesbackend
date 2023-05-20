import mongoose, { Schema } from "mongoose";

const SchemaScheduleModel = {
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
    type: Schema.Types.ObjectId,
    ref: "usergroup",
    required: true,
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
    type: Schema.Types.ObjectId,
    ref: "Users",
    required: true,
  },
};

const ScheduleModel = new mongoose.Schema(SchemaScheduleModel, {
  timestamps: true,
});

ScheduleModel.index({
  name: 1,
  status: 1,
  type: 1,
  workflowState: 1,
  createdBy: 1,
});

export default mongoose.model("schedule", ScheduleModel);

import mongoose, { Schema } from "mongoose";

const CallsheetModel = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    type: {
      type: String,
      enum: ["in", "out"],
    },
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
    contact: {
      _id: {
        type: Schema.Types.ObjectId,
        required: true,
      },
      name: { type: String, required: true },
      phone: { type: Number, required: true },
    },
    rate: {
      type: Number,
      default: 0,
    },
    createdBy: {
      _id: {
        type: Schema.Types.ObjectId,
        required: true,
      },
      name: { type: String, required: true },
    },
    schedule: [
      {
        _id: { type: Schema.Types.ObjectId, required: true },
        name: { type: String, required: true },
        notes: { type: String, required: true },
        scheduleList: {
          _id: { type: Schema.Types.ObjectId, required: true },
          notes: { type: String, required: true },
        },
      },
    ],
    status: {
      type: String,
      enum: ["0", "1", "2"],
      default: "0",
      index: true,
    },
    workflowState: {
      type: String,
      required: true,
      default: "Draft",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

CallsheetModel.index({
  name: 1,
  type: 1,
  status: 1,
  workflowState: 1,
  customer: 1,
  rate: 1,
  contact: 1,
  schedule: 1,
});

export default mongoose.model("callsheet", CallsheetModel);

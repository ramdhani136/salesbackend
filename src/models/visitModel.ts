import mongoose, { Schema } from "mongoose";

const VisitModel = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    type: {
      type: String,
      enum: ["insite", "outsite"],
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
    address: {
      type: String,
    },
    contact: {
      _id: {
        type: Schema.Types.ObjectId,
        required: true,
      },
      name: { type: String, required: true },
      phone: { type: Number, required: true },
    },
    img: {
      type: String,
    },
    signature: {
      type: String,
      required: true,
    },
    location: {
      lat: {
        required: true,
        type: String,
      },
      lng: {
        required: true,
        type: String,
      },
    },
    rate: {
      type: Number,
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
        _id: { type: Schema.Types.ObjectId },
        name: { type: String },
        notes: { type: String },
        scheduleList: {
          _id: { type: Schema.Types.ObjectId },
          notes: { type: String },
        },
      },
    ],
    checkOut: {
      createdAt: { type: Date },
      lat: {
        type: String,
      },
      lng: {
        type: String,
      },
    },
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

VisitModel.index({
  name: 1,
  type: 1,
  status: 1,
  workflowState: 1,
  customer: 1,
  rate: 1,
  contact: 1,
  schedule: 1,
});

export default mongoose.model("visit", VisitModel);

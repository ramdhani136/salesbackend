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
      default: "insite",
    },
    customer: {
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
    lat: {
      type: String,
    },
    lng: {
      type: String,
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

    schedule: {
      _id: { type: Schema.Types.ObjectId },
      name: { type: String },
      scheduleList: { type: Schema.Types.ObjectId },
    },
    checkOut: {
      createdAt: { type: Date, required: true },
      lat: {
        type: String,
        required: true,
      },
      lng: {
        type: String,
        required: true,
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

export default mongoose.model("visit", VisitModel);

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

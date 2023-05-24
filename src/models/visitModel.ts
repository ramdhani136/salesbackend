import mongoose, { Schema } from "mongoose";

const VisitModel = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["insite", "outsite"],
      index: true,
    },
    customer: {
      type: Schema.Types.ObjectId,
      ref: "customer",
      required: true,
      index: true,
    },
    address: {
      type: String,
    },
    contact: {
      type: Schema.Types.ObjectId,
      ref: "contact",
      required: true,
      index: true,
    },
    img: {
      type: String,
    },
    signature: {
      type: String,
    },
    checkIn: {
      createdAt: { type: Date },
      lat: {
        type: Number,
        required: true,
      },
      lng: {
        type: Number,
        required: true,
      },
    },
    rate: {
      type: Number,
      default: 0,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "customer",
      required: true,
      index: true,
    },
    schedule: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: "schedulelist",
          required: true,
          index: true,
        },
      ],
    },
    checkOut: {
      createdAt: { type: Date },
      lat: {
        type: Number,
      },
      lng: {
        type: Number,
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

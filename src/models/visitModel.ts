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
      createdAt: { type: Date, index: -1 },
      lat: {
        type: Number,
        required: true,
      },
      lng: {
        type: Number,
        required: true,
      },
      address: {
        type: String,
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
    schedulelist: {
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
      createdAt: { type: Date, index: -1 },
      lat: {
        type: Number,
      },
      lng: {
        type: Number,
      },
      address: {
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
  createdAt: -1,
});
VisitModel.index({
  updatedAt: -1,
});

export default mongoose.model("visit", VisitModel);

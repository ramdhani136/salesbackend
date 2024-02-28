import mongoose, { Schema } from "mongoose";

const LocationModel = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["Warehouse", "Office", "Branch", "Lainnya"],
      default: "Office",
      index: true,
    },
    customer: {
      type: Schema.Types.ObjectId,
      ref: "customer",
      required: true,
      index: 1,
    },
    img: {
      type: String,
    },
    address: {
      type: String,
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        required: false,
      },
      coordinates: {
        type: [Number],
        required: false,
      },
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "Users",
      required: true,
      index: true,
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

LocationModel.index({ location: "2dsphere" });

LocationModel.index({
  createdAt: -1,
});

LocationModel.index({
  updatedAt: -1,
});

LocationModel.index({
  customer: 1,
});

export default mongoose.model("location", LocationModel);

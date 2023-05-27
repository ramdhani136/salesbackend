import mongoose, { Schema } from "mongoose";

const CustomerModel = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      // unique: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["Individual", "Company"],
      default: "Company",
      index: true,
    },
    customerGroup: {
      type: Schema.Types.ObjectId,
      ref: "customergroup",
      required: true,
      index: 1,
    },
    branch: {
      type: Schema.Types.ObjectId,
      ref: "branch",
      required: true,
      index: true,
    },

    img: {
      type: String,
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
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
      enum: ["0", "1", "2", "3"],
      default: "1",
      index: true,
    },
    workflowState: {
      type: String,
      required: true,
      default: "Submitted",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

CustomerModel.index({ location: "2dsphere" });

CustomerModel.index({
  createdAt: -1,
});

CustomerModel.index({
  updatedAt: -1,
});

CustomerModel.index({
  customerGroup: 1,
  branch: 1,
});

export default mongoose.model("customer", CustomerModel);

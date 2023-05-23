import mongoose, { Schema } from "mongoose";

const CustomerModel = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    type: {
      type: String,
      enum: ["Individual", "Company"],
      default: "Company",
    },
    customerGroup: {
      type: Schema.Types.ObjectId,
      ref: "customergroup",
      required: true,
    },
    branch: {
      type: Schema.Types.ObjectId,
      ref: "branch",
      required: true,
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
    },
    status: {
      type: String,
      enum: ["0", "1", "2"],
      default: "1",
    },
    workflowState: {
      type: String,
      required: true,
      default: "Submitted",
    },
  },
  {
    timestamps: true,
  }
);

CustomerModel.index({ location: "2dsphere" });

CustomerModel.index({
  name: 1,
  type: 1,
  status: 1,
  workflowState: 1,
  customerGroup: 1,
  branch: 1,
  createdBy: 1,
});

export default mongoose.model("customer", CustomerModel);

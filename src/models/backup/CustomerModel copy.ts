import mongoose, { Schema } from "mongoose";

const CustomerModel = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["Individual", "Company"],
      default: "Company",
      index: true,
    },
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

    img: {
      type: String,
    },
    lat: {
      type: String,
    },
    lng: {
      type: String,
    },
    createdBy: {
      _id: {
        type: Schema.Types.ObjectId,
        required: true,
      },
      name: { type: String, required: true },
    },
    status: {
      type: String,
      enum: ["0", "1", "2"],
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

CustomerModel.index({
  name: 1,
  type: 1,
  status: 1,
  workflowState: 1,
  customerGroup: 1,
  branch: 1,
});


export default mongoose.model("customer", CustomerModel);


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

export default mongoose.model("customer", VisitModel);

VisitModel.index({
  // name: 1,
  // type: 1,
  // status: 1,
  // workflowState: 1,
  // customerGroup: 1,
  // branch: 1,
});

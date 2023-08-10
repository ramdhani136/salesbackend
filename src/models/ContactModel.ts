import mongoose, { Schema } from "mongoose";

const ContactModel = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      index: 1,
    },
    phone: {
      type: Number,
      required: true,
      index: 1,
    },
    email: {
      type: Number,
      index: 1,
    },
    customer: {
      type: Schema.Types.ObjectId,
      ref: "customer",
      required: true,
      index: -1,
    },
    position: {
      type: String,
      required: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "Users",
      required: true,
      index: 1,
    },
    status: {
      type: String,
      enum: ["0", "1", "2"],
      default: "0",
      index: 1,
    },
    workflowState: {
      type: String,
      required: true,
      default: "Draft",
      index: 1,
    },
  },
  {
    timestamps: true,
  }
);

ContactModel.index({
  createdAt: -1,
});
ContactModel.index({
  updatedAt: -1,
});

export default mongoose.model("contact", ContactModel);

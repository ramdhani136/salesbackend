import mongoose, { Schema } from "mongoose";

const ContactModel = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    phone: {
      type: Number,
      required: true,
    },
    email: {
      type: Number,
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
    desc: {
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

ContactModel.index({
  name: 1,
  phone: 1,
  email: 1,
  customer: 1,
  status: 1,
  workflowState: 1,
});


export default mongoose.model("contact", ContactModel);


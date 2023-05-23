import mongoose, { Schema } from "mongoose";

const CallsheetModel = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["in", "out"],
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
    rate: {
      type: Number,
      default: 0,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "Users",
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

export default mongoose.model("callsheet", CallsheetModel);

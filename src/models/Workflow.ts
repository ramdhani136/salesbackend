import mongoose, { Schema } from "mongoose";

const Workflow = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      index: true,
      unique:true
    },
    doc: {
      type: String,
      required: true,
      index: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
      ref: "Users",
    },
    status: {
      type: Boolean,
      default: 0,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("workflows", Workflow);

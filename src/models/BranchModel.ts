import mongoose, { Schema } from "mongoose";

const Branch = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    lat: {
      type: String,
    },
    lng: {
      type: String,
    },
    desc: {
      type: String,
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
    },
    workflowState: {
      type: String,
      required:true,
      default:"Draft"
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("branch", Branch);

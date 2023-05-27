import mongoose, { Schema } from "mongoose";

const Branch = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      index: 1,
    },
    lat: {
      type: String,
      index: 1,
    },
    lng: {
      type: String,
      index: 1,
    },
    desc: {
      type: String,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "Users",
      required: true,
      index: 1,
    },
    status: {
      type: String,
      enum: ["0", "1", "2","3"],
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

Branch.index({
  createdAt: -1,
});
Branch.index({
  updatedAt: -1,
});

export default mongoose.model("branch", Branch);

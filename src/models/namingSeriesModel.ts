import mongoose, { Schema } from "mongoose";

const NamingSeriesModel = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      index: 1,
    },
    branch: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: "branch",
          required: true,
          index: 1,
        },
      ],
      required: true,
    },
    doc: {
      type: String,
      enum: ["visit", "callsheet", "schedule", "memo"],
      required: true,
      index: 1,
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
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

NamingSeriesModel.index({
  createdAt: -1,
});
NamingSeriesModel.index({
  updatedAt: -1,
});

export default mongoose.model("namingseries", NamingSeriesModel);

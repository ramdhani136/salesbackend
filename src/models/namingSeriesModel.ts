import mongoose, { Schema } from "mongoose";

const NamingSeriesModel = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    branch: [
      {
        type: Schema.Types.ObjectId,
        ref: "branch",
        required: true,
        index: true,
      },
    ],
    doc: {
      type: String,
      enum: ["visit", "callsheet", "schedule"],
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

NamingSeriesModel.index({ name: 1, branch: 1, doc: 1 });


export default mongoose.model("namingseries", NamingSeriesModel);


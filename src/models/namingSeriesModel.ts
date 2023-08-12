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
      enum: ["visit", "callsheet", "schedule","memo"],
      required: true,
      index: 1,
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

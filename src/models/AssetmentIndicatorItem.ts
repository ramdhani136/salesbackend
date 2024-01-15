import mongoose, { Schema } from "mongoose";

const AssesmentIndicatorItem = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    assementIndicatorId: {
      type: Schema.Types.ObjectId,
      ref: "assesmentindicator ",
      required: true,
    },
    weight: {
      type: Number,
    },
    desc: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

AssesmentIndicatorItem.index({
  createdAt: -1,
});
AssesmentIndicatorItem.index({
  updatedAt: -1,
});
AssesmentIndicatorItem.index({
  name: -1,
});

export default mongoose.model("assesmentindicatoritem", AssesmentIndicatorItem);

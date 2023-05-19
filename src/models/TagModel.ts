import mongoose, { Schema } from "mongoose";

const TagModel = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

TagModel.index({ name: 1, createdBy: 1 });

export default mongoose.model("tag", TagModel);

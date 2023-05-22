import mongoose, { Schema } from "mongoose";

const TagModel = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    createdBy: {
      _id: {
        type: Schema.Types.ObjectId,
        required: true,
      },
      name: { type: String },
    },
  },
  {
    timestamps: true,
  }
);


TagModel.index({ name: 1 });


export default mongoose.model("tag", TagModel);
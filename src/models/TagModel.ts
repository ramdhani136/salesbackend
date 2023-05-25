import mongoose, { Schema } from "mongoose";

const TagModel = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      index:true
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "Users",
      required: true,
      index:true
    },
  },
  {
    timestamps: true,
  }
);

TagModel.index({
  createdAt: -1,
});
TagModel.index({
  updatedAt: -1,
});


export default mongoose.model("tag", TagModel);

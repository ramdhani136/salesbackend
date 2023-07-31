import mongoose, { Schema } from "mongoose";

const FileModel = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      index: true,
    },
    type:{
      type: String,
      required: true,
      index: true,
    },
    doc: {
      type: {
        type: String,
        required: true,
        enum : ["visit","callsheet"],
      },
      _id: {
        type: Schema.Types.ObjectId,
        required: true,
      },
      name: {
        type: String,
        required: true,
      },
    },
    note: {
      type: Schema.Types.ObjectId,
      ref: "notes",
      required: true,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "customer",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

FileModel.index({
  createdAt: -1,
});
FileModel.index({
  updatedAt: -1,
});

export default mongoose.model("file", FileModel);

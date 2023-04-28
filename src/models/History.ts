import mongoose, { Schema } from "mongoose";

const History = new mongoose.Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "Users",
      required: true,
      index: true,
    },
    document: {
      _id: {
        type: Schema.Types.ObjectId,
        required: true,
        index: true,
      },
      name: {
        type: String,
        required: true,
        index: true,
      },
      type: {
        type: String,
        required: true,
        index: true,
      },
    },
    message: {
      type: String,
      require: true,
    },
    status: {
      type: Boolean,
      default: 0,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("history", History);

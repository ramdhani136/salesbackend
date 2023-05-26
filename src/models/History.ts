import mongoose, { Schema } from "mongoose";

const History = new mongoose.Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "Users",
      required: true,
      index: 1,
    },
    document: {
      _id: {
        type: Schema.Types.ObjectId,
        required: true,
        index: 1,
      },
      name: {
        type: String,
        required: true,
        index: 1,
      },
      type: {
        type: String,
        required: true,
        index: 1,
      },
    },
    message: {
      type: String,
      require: true,
    },
    status: {
      type: Boolean,
      default: 0,
      index: 1,
    },
  },
  {
    timestamps: true,
  }
);

History.index({
  createdAt: -1,
});
History.index({
  updatedAt: -1,
});

History.index({ status: 1 });

export default mongoose.model("history", History);

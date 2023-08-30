import mongoose, { Schema } from "mongoose";

const History = new mongoose.Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    },
    document: {
      _id: {
        type: Schema.Types.ObjectId,
        required: true,
      },
      name: {
        type: String,
        required: true,
      },
      type: {
        type: String,
        required: true,
      },
    },
    message: {
      type: String,
      require: true,
    },
    status: {
      type: String,
      enum: ["0", "1"],
      default: "0",
      index: true,
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

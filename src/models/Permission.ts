import mongoose, { Schema } from "mongoose";

const Permission = new mongoose.Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "Users",
      required: true,
      index: true,
    },
    allow: {
      type: String,
      require: true,
      index: true,
    },
    doc: {
      type: String,
      require: true,
      index: true,
    },
    alldoc: {
      type: Boolean,
      index: true,
      default: 0,
    },
    value: {
      type: String,
      require: true,
      index: true,
    },
    uniqId: {
      type: String,
      require: true,
      index: true,
    },
    cratedBy: {
      type: Schema.Types.ObjectId,
      ref: "Users",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Permissions", Permission);

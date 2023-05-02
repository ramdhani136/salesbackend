import mongoose from "mongoose";

const status = Object.freeze({
  0: 0,
  1: 1,
});

const User = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
    },
    phone: {
      type: Number,
    },
    img: {
      type: String,
    },
    erpToken: {
      type: String,
    },
    password: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["0", "1", "2", "3"],
      default: "0",
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Users", User);

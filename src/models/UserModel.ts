import mongoose from "mongoose";

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
      enum: ["0", "1", "2"],
      default: "0",
    },
  },
  {
    timestamps: true,
  }
);


User.index({ name: 1, email: 1, username: 1, status: 1 });

export default mongoose.model("Users", User);


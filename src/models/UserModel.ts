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
      index: true,
    },
    email: {
      type: String,
    },
    phone: {
      type: Number,
    },
    ErpSite: {
      type: String,
    },
    ErpToken: {
      type: String,
    },
    img: {
      type: String,
    },
    password: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["0", "1", "3"],
      default: "0",
      index: true,
    },
    workflowState: {
      type: String,
      required: true,
      default: "Draft",
      index: 1,
    },
  },
  {
    timestamps: true,
  }
);

User.index({
  createdAt: -1,
});
User.index({
  updatedAt: -1,
});

export default mongoose.model("Users", User);

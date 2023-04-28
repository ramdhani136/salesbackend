import mongoose, { Schema } from "mongoose";

const MessageModel = new mongoose.Schema(
  {
    sender: { type: Schema.Types.ObjectId, ref: "Users", required: true },
    content: { type: String, trim: true },
    chat: {
      type: Schema.Types.ObjectId,
      ref: "Chat",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Message", MessageModel);

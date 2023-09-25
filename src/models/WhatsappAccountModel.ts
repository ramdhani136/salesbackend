import mongoose, { Schema } from "mongoose";

const WhatsappAccountModel = new mongoose.Schema(
  {
    _id: {
      type: String, 
      required: true,
      unique: true, 
    },
    name: {
      type: String,
      required: true,
      unique: true,
      index: 1,
    },
    desc: {
      type: String,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "Users",
      required: true,
      index: 1,
    },
    status: {
      type: String,
      enum: ["0", "1"],
      default: "0",
      index: 1,
    },
  },
  {
    timestamps: true,
  }
);

WhatsappAccountModel.index({
  name: -1,
});


export default mongoose.model("whatsappaccount", WhatsappAccountModel);

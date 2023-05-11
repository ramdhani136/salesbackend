import mongoose, { Schema } from "mongoose";
import visitModel from "./visitModel";
import TagModel from "./TagModel";

const CallsheetNoteModel = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },

    callsheet: visitModel,
    tag: TagModel,
    createdBy: {
      _id: {
        type: Schema.Types.ObjectId,
        required: true,
      },
      name: { type: String },
    },
  },
  {
    timestamps: true,
  }
);


CallsheetNoteModel.index({ name: 1 });

export default mongoose.model("callsheetnote", CallsheetNoteModel);


import mongoose, { Schema } from "mongoose";
import visitModel from "./visitModel";
import TagModel from "./TagModel";

const VisitNoteModel = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },

    visit: visitModel,
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

export default mongoose.model("visitnote", VisitNoteModel);

VisitNoteModel.index({ name: 1 });

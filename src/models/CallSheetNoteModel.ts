import mongoose, { Schema } from "mongoose";
import visitModel from "./visitModel";
import TagModel from "./TagModel";

const CallsheetNoteModel = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    callsheet: {
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
        enum: ["in", "out"],
      },
      customer: {
        _id: {
          type: Schema.Types.ObjectId,
          required: true,
        },
        name: { type: String, required: true },
        customerGroup: {
          _id: {
            type: Schema.Types.ObjectId,
            required: true,
          },
          name: { type: String, required: true },
          branch: {
            _id: {
              type: Schema.Types.ObjectId,
              required: true,
            },
            name: { type: String, required: true },
          },
        },
      },
      contact: {
        _id: {
          type: Schema.Types.ObjectId,
          required: true,
        },
        name: { type: String, required: true },
        phone: { type: Number, required: true },
      },
      rate: {
        type: Number,
        default: 0,
      },
      createdBy: {
        _id: {
          type: Schema.Types.ObjectId,
          required: true,
        },
        name: { type: String, required: true },
      },
      schedule: [
        {
          _id: { type: Schema.Types.ObjectId, required: true },
          name: { type: String, required: true },
          notes: { type: String, required: true },
          scheduleList: {
            _id: { type: Schema.Types.ObjectId, required: true },
            notes: { type: String, required: true },
          },
        },
      ],
      status: {
        type: String,
        enum: ["0", "1", "2"],
        default: "0",
        index: true,
      },
      workflowState: {
        type: String,
        required: true,
        default: "Draft",
        index: true,
      },
      createdAt: {
        type: Date,
        required: true,
      },
      updatedAt: {
        type: Date,
        required: true,
      },
    },

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

// CallsheetNoteModel.index({ name: 1 });

export default mongoose.model("callsheetnote", CallsheetNoteModel);

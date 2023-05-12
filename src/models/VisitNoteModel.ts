import mongoose, { Schema } from "mongoose";

const VisitNoteModel = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },

    visit: {
      _id: { type: Schema.Types.ObjectId },
      name: {
        type: String,
        required: true,
        unique: true,
      },
      type: {
        type: String,
        enum: ["insite", "outsite"],
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
      rate: {
        type: Number,
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
    tag: [
      {
        _id: { type: Schema.Types.ObjectId, required: true },
        name: { type: String, required: true },
      },
    ],
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

VisitNoteModel.index({ name: 1 });

export default mongoose.model("visitnote", VisitNoteModel);

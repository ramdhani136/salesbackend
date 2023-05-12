import mongoose, { Schema } from "mongoose";

const VisitNoteModel = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      index: true,
    },

    visit: {
      _id: { type: Schema.Types.ObjectId, index: true },
      name: {
        type: String,
        required: true,
        index: true,
      },
      type: {
        type: String,
        enum: ["insite", "outsite"],
        index: true,
      },
      customer: {
        _id: {
          type: Schema.Types.ObjectId,
          required: true,
          index: true,
        },
        name: { type: String, required: true, index: true },
        customerGroup: {
          _id: {
            type: Schema.Types.ObjectId,
            required: true,
            index: true,
          },
          name: { type: String, required: true, index: true },
          branch: {
            _id: {
              type: Schema.Types.ObjectId,
              required: true,
              index: true,
            },
            name: { type: String, required: true, index: true },
          },
        },
      },
      rate: {
        type: Number,
        index: true,
        default: 0,
      },
      createdBy: {
        _id: {
          type: Schema.Types.ObjectId,
          required: true,
          index: true,
        },
        name: { type: String, required: true, index: true },
      },
      schedule: [
        {
          _id: { type: Schema.Types.ObjectId, required: true, index: true },
          name: { type: String, required: true, index: true },
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
    tag: {
      type: [
        {
          _id: { type: Schema.Types.ObjectId, required: true, index: true },
          name: { type: String, required: true, index: true },
        },
      ],
      required: true,
      validate: {
        validator: function (arr: any) {
          return arr.length > 0; // Memvalidasi bahwa array memiliki setidaknya satu elemen
        },
        message: "Array harus diisi setidaknya dengan satu tag.",
      },
    },
    note: {
      type: String,
      required: true,
    },

    createdBy: {
      _id: {
        type: Schema.Types.ObjectId,
        required: true,
        index: true,
      },
      name: { type: String, index: true },
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("visitnote", VisitNoteModel);

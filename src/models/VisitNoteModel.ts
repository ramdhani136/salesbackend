import mongoose, { Schema } from "mongoose";

const VisitNoteModel = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    visit: {
      _id: { type: Schema.Types.ObjectId },
      name: {
        type: String,
        required: true,
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
          _id: { type: Schema.Types.ObjectId, required: true },
          name: { type: String, required: true },
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
      },
      name: { type: String },
    },
  },
  {
    timestamps: true,
  }
);

// VisitNoteModel.index({
//   name: 1,
//   visit: 1,
//   rate: 1,
//   createdBy: 1,
//   tag: 1,
// });

export default mongoose.model("visitnote", VisitNoteModel);

import mongoose, { Schema } from "mongoose";

const CallsheetNoteModel = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    callsheet: {
      type: Schema.Types.ObjectId,
      ref: "callsheet",
      required: true,
    },
    tags: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: "tag",
          required: true,
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
    notes: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

CallsheetNoteModel.index({ title: 1, createdAt: -1, updatedAt: -1 });

export default mongoose.model("callsheetnote", CallsheetNoteModel);

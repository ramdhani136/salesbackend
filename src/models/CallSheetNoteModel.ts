import mongoose, { Schema } from "mongoose";

const CallsheetNoteModel = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      index: true,
    },
    callsheet: {
      type: Schema.Types.ObjectId,
      ref: "callsheet",
      required: true,
      index: -1,
    },
    tags: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: "tag",
          required: true,
          index: true,
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
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

CallsheetNoteModel.index({
  createdAt: -1,
});
CallsheetNoteModel.index({
  updatedAt: -1,
});


export default mongoose.model("callsheetnote", CallsheetNoteModel);

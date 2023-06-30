import mongoose, { Schema } from "mongoose";

const VisitNoteModel = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      index: true,
    },
    visit: {
      type: Schema.Types.ObjectId,
      ref: "visit",
      required: true,
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

VisitNoteModel.index({
  createdAt: -1,
});
VisitNoteModel.index({
  updatedAt: -1,
});


export default mongoose.model("visitnote", VisitNoteModel);

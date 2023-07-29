import mongoose, { Schema } from "mongoose";

const NotesModel = new mongoose.Schema(
  {
    task: {
      type: String,
    },
    doc: {
      type: {
        type: String,
        required: true,
      },
      _id: {
        type: Schema.Types.ObjectId,
        required: true,
      },
      name: {
        type: String,
        required: true,
      },
    },
    customer: {
      type: Schema.Types.ObjectId,
      ref: "customer",
      required: true,
      index: true,
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
    result: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

NotesModel.index({
  createdAt: -1,
});
NotesModel.index({
  updatedAt: -1,
});


export default mongoose.model("notes", NotesModel);

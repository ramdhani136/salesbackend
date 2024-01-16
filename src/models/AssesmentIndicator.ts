import mongoose, { Schema } from "mongoose";

const AssesmentIndicator = new mongoose.Schema(
  {
    assesmentTemplateId: {
      type: Schema.Types.ObjectId,
      ref: "assesmenttemplate",
      required: true,
    },
    questionId: {
      type: Schema.Types.ObjectId,
      ref: "assesmentquestion",
      required: true,
    },
    weight: {
      type: Number,
      required: true,
    },
    desc: {
      type: String,
    },
    options: {
      type: [{
        name: {
          type: String,
          required: true,
          unique: true,
        },
        weight: {
          type: Number,
          required: true
        },
      }],
      required: true,
      validate: {
        validator: function (arr: any) {
          return arr.length > 0; // Memvalidasi bahwa array memiliki setidaknya satu elemen
        },
        message: "Wajib mengisi pilihan jawaban!.",
      },
    }
  },
  {
    timestamps: true,
  }
);

AssesmentIndicator.index({
  createdAt: -1,
});
AssesmentIndicator.index({
  updatedAt: -1,
});

export default mongoose.model("assesmentindicator", AssesmentIndicator);

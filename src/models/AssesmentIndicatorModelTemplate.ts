import { Schema } from "mongoose";

const AssesmentIndicatorModelTemplate =
{
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
};




export default AssesmentIndicatorModelTemplate

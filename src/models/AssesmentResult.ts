import mongoose, { Schema } from "mongoose";

const AssesmentResult = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      index: 1,
    },
    customer: {
      _id: {
        type: Schema.Types.ObjectId,
        required: true,
        index: 1,
      },
      name: {
        type: String,
        required: true,
        index: 1,
      }
    },
    createdBy: {
      _id: {
        type: Schema.Types.ObjectId,
        required: true,
        index: 1,
      },
      name: {
        type: String,
        required: true,
        index: 1,
      }
    },
    schedule: {
      _id: {
        type: Schema.Types.ObjectId,
        required: true,
        index: 1,
      },
      name: {
        type: String,
        required: true,
        index: 1,
      }
    },
    activeDate: {
      type: Date,
      required: true,
      index: true,
    },
    deactiveDate: {
      type: Date,
      require: true,
      index: true,
    },
    score: {
      type: Number,
      required: true,
    },
    grade: {
      type: String,
      required: true,
    },
    notes: {
      type: String,
      required: true,
    },
    details: [
      { question: { type: String, required: true }, answer: { type: String, required: true }, score: { type: Number, required: true, } }
    ],
  },
  {
    timestamps: true,
  }
);

AssesmentResult.index({
  createdAt: -1,
});
AssesmentResult.index({
  updatedAt: -1,
});
AssesmentResult.index({
  activeDate: -1,
  deactiveDate: 1,
});
AssesmentResult.index({
  activeDate: 1,
  deactiveDate: -1,
});
AssesmentResult.index({
  name: -1,
});

export default mongoose.model("assesmentresult", AssesmentResult);

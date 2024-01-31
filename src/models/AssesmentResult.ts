import mongoose, { Schema } from "mongoose";
import AssesmentIndicatorModel from "./AssesmentIndicatorModel";
import AssesmentGradeModel from "./AssesmentGradeModel";

const AssesmentResult = new mongoose.Schema(
  {
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
    assesmentTemplate: {
      _id: {
        type: Schema.Types.ObjectId,
        required: true
      },
      name: {
        type: String,
        required: true
      },
      indicators: {
        type: [AssesmentIndicatorModel],
        required: true,
      },
      grades: {
        type: [AssesmentGradeModel],
        required: true
      }
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
      {
        question: {
          _id: {
            type: Schema.Types.ObjectId,
            required: true
          },
          name: {
            type: String,
            required: true
          }
        },
        answer: {
          type: String,
          required: true
        },
        score: {
          type: Number,
          required: true,
        },
      }
    ],
    status: {
      type: String,
      enum: ["0", "1"],
      default: "1",
      index: 1,
    },
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

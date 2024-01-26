import { Schema } from "mongoose";

const AssesmentGradeModel =
{
  name: {
    type: String,
    required: true,
  },
  bottom: {
    type: Number,
    required: true,
  },
  top: {
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
};





export default AssesmentGradeModel;

import mongoose, { Schema } from "mongoose";

const AssesmentSettings = new mongoose.Schema(
  {
    schedule_loop: Number
    ,
    defaultOpening: {
      type: String,
      required: true,
      index: 1,
    },
    assesmentTemplateId: {
      type: Schema.Types.ObjectId,
      ref: "assesmenttemplate ",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);




export default mongoose.model("assesmentsettings", AssesmentSettings);

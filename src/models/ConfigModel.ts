import mongoose, { Schema } from "mongoose";

const ConfigModel = new mongoose.Schema(
  {
    visit: {
      checkOutDistance: {
        type: Number,
        default: 50,
      },
      checkInDistance: {
        type: Number,
        default: 50,
      },
      notesLength: {
        type: Number,
        default: 1,
      },
      tagsMandatory: {
        type: [
          {
            type: Schema.Types.ObjectId,
            ref: "tag",
            required: true,
            index: true,
          },
        ],
      },
    },
    callsheet: {
      notesLength: {
        type: Number,
        default: 1,
      },
      tagsMandatory: {
        type: [
          {
            type: Schema.Types.ObjectId,
            ref: "tag",
            required: true,
            index: true,
          },
        ],
      },
    },
    customer: {
      locationDistance: {
        type: Number,
        default: 0,
      },
    },
  },
  {
    timestamps: true,
  }
);

ConfigModel.index({
  createdAt: -1,
});
ConfigModel.index({
  updatedAt: -1,
});

export default mongoose.model("config", ConfigModel);

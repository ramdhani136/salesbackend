import mongoose, { Schema } from "mongoose";

const CallsheetModel = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["in", "out"],
      index: true,
    },
    customer: {
      type: Schema.Types.ObjectId,
      ref: "customer",
      required: true,
      index: true,
    },
    contact: {
      type: Schema.Types.ObjectId,
      ref: "contact",
      index: true,
    },
    rate: {
      type: Number,
      default: 0,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "Users",
      required: true,
      index: true,
    },
    schedulelist: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: "schedulelist",
          required: true,
          index: true,
        },
      ],
    },
    taskNotes: {
      type: [
        {
          type: {
            _id: {
              type: Schema.Types.ObjectId,
              required: true,
            },
            from: {
              type: String,
              enum: ["Memo", "Schedule"],
              required: true,
            },
            name: {
              type: String,
              required: true,
            },
            title: {
              type: String,
              required: true,
            },
            notes: {
              type: String,
              required: true,
            },
          },
          required: false,
        },
      ],
    },
    status: {
      type: String,
      enum: ["0", "1", "2"],
      default: "0",
      index: true,
    },
    workflowState: {
      type: String,
      required: true,
      default: "Draft",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

CallsheetModel.index({
  createdAt: -1,
});
CallsheetModel.index({
  updatedAt: -1,
});

export default mongoose.model("callsheet", CallsheetModel);

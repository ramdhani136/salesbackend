import mongoose, { Schema } from "mongoose";

const ScheduleListModel = new mongoose.Schema(
  {
    schedule: {
      _id: {
        type: Schema.Types.ObjectId,
        required: true,
      },
      name: {
        type: String,
        required: true,
      },
      type: {
        type: String,
        required: true,
        enum: ["visit", "callsheet"],
      },
      notes: {
        type: String,
        required: true,
      },
      userGroup: {
        _id: {
          type: Schema.Types.ObjectId,
          required: true,
        },
        name: {
          type: String,
          required: true,
        },
      },
      activeDate: {
        type: Date,
        required: true,
      },
      closingDate: {
        type: Date,
        require: true,
      },
      status: {
        type: String,
        enum: ["0", "1", "2"],
        default: "0",
      },
      workflowState: {
        type: String,
        required: true,
        default: "Draft",
      },
      createdBy: {
        _id: {
          type: Schema.Types.ObjectId,
          required: true,
        },
        name: {
          type: String,
          required: true
        },
      },
      createdAt: {
        type: Date,
        require: true,
      },
      updatedAt: {
        type: Date,
        require: true,
      },
    },
    customer: {
      _id: {
        type: Schema.Types.ObjectId,
        required: true,
      },
      name: { type: String, required: true },
    },
    customerGroup: {
      _id: {
        type: Schema.Types.ObjectId,
        required: true,
      },
      name: { type: String, required: true },
    },
    branch: {
      _id: {
        type: Schema.Types.ObjectId,
        required: true,
      },
      name: { type: String, required: true },
    },
    notes: {
      type: String,
    },
    status: {
      type: String,
      enum: ["0", "1"],
      default: "0",
    },
    closing: {
      date: {
        type: Date,
      },
      user: {
        _id: {
          type: Schema.Types.ObjectId,
        },
        name: { type: String },
      },
      doc: {
        _id: {
          type: Schema.Types.ObjectId,
        },
        name: { type: String },
      },
    },
    createdBy: {
      _id: {
        type: Schema.Types.ObjectId,
        required: true,
      },
      name: { type: String },
    },
  },
  {
    timestamps: true,
  }
);

ScheduleListModel.index({
  schedule: 1,
  status: 1,
  customer: 1,
  workflowState: 1,
  createdBy: 1,
});

export default mongoose.model("schedulelist", ScheduleListModel);

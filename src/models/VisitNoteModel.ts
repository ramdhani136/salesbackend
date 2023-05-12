import mongoose, { Schema } from "mongoose";

const VisitNoteModel = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    visit: {
      _id: { type: Schema.Types.ObjectId, index: true },
      name: {
        type: String,
        required: true,
        unique: true,
        index: true,
      },
      type: {
        type: String,
        enum: ["insite", "outsite"],
        index: true,
      },
      customer: {
        _id: {
          type: Schema.Types.ObjectId,
          required: true,
          index: true,
        },
        name: { type: String, required: true, index: true },
        customerGroup: {
          _id: {
            type: Schema.Types.ObjectId,
            required: true,
            index: true,
          },
          name: { type: String, required: true, index: true },
          branch: {
            _id: {
              type: Schema.Types.ObjectId,
              required: true,
              index: true,
            },
            name: { type: String, required: true, index: true },
          },
        },
      },
      rate: {
        type: Number,
        index: true,
      },
      createdBy: {
        _id: {
          type: Schema.Types.ObjectId,
          required: true,
          index: true,
        },
        name: { type: String, required: true, index: true },
      },
      schedule: [
        {
          _id: { type: Schema.Types.ObjectId, required: true, index: true },
          name: { type: String, required: true, index: true },
          notes: { type: String, required: true },
          scheduleList: {
            _id: { type: Schema.Types.ObjectId, required: true },
            notes: { type: String, required: true },
          },
        },
      ],
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
      createdAt: {
        type: Date,
        required: true,
      },
      updatedAt: {
        type: Date,
        required: true,
      },
    },
    tag: [
      {
        _id: { type: Schema.Types.ObjectId, required: true, index: true },
        name: { type: String, required: true, index: true },
      },
    ],
    createdBy: {
      _id: {
        type: Schema.Types.ObjectId,
        required: true,
        index: true,
      },
      name: { type: String, index: true },
    },
  },
  {
    timestamps: true,
  }
);

// VisitNoteModel.index({
//   name: 1,
//   "visit.name": 1,
//   "visit.rate": 1,
//   "visit._id": 1,
//   "visit.type": 1,
//   "visit.customer.name": 1,
//   "visit.customer._id": 1,
//   "visit.customer.customerGroup._id": 1,
//   "visit.customer.customerGroup.name": 1,
//   "visit.customer.customerGroup.branch._id": 1,
//   "visit.customer.customerGroup.branch.name": 1,
// });

export default mongoose.model("visitnote", VisitNoteModel);

import mongoose, { Schema } from "mongoose";

const MemoModel = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    display: {
      type: [
        {
          type: String,
          enum: ["visit", "callsheet", "dashboard", "alert"], // Nilai string yang diizinkan
        },
      ],
      required: true,
      validate: {
        validator: function (arr: any) {
          return arr.length > 0; // Memvalidasi bahwa array memiliki setidaknya satu elemen
        },
        message: "Array harus diisi setidaknya dengan satu display.",
      },
    },
    title: {
      type: String,
      required: true,
    },
    notes: {
      type: String,
      required: true,
    },
    img: {
      type: String,
    },
    status: {
      type: String,
      enum: ["0", "1", "2", "3"],
      default: "0",
    },
    workflowState: {
      type: String,
      required: true,
      default: "Draft",
    },
    activeDate: {
      type: Date,
      required: true,
    },
    closingDate: {
      type: Date,
      require: true,
    },

    branch: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: "branch",
          index: 1,
        },
      ],
    },

    customerGroup: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: "customergroup",
          index: 1,
        },
      ],
    },

    userGroup: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: "usergroup",
          index: 1,
        },
      ],
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

MemoModel.index({
  name: -1,
});
MemoModel.index({
  display: 1,
});
MemoModel.index({
  status: 1,
});
MemoModel.index({
  workflowState: -1,
});
MemoModel.index({
  activeDate: 1,
});
MemoModel.index({
  closingDate: 1,
});
MemoModel.index({
  activeDate: 1,
  closingDate: -1,
});
MemoModel.index({
  createdAt: -1,
});
MemoModel.index({
  updatedAt: -1,
});

export default mongoose.model("memo", MemoModel);

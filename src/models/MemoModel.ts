import mongoose, { Schema } from "mongoose";

const MemoModel = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      index: 1,
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
      index: 1,
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
      index: 1,
    },
    workflowState: {
      type: String,
      required: true,
      default: "Draft",
      index: 1,
    },
    activeDate: {
      type: Date,
      required: true,
      index: 1,
    },
    closingDate: {
      type: Date,
      require: true,
      index: 1,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "Users",
      required: true,
      index: 1,
    },
  },
  {
    timestamps: true,
  }
);

MemoModel.index({
  createdAt: -1,
});
MemoModel.index({
  updatedAt: -1,
});

export default mongoose.model("memo", MemoModel);

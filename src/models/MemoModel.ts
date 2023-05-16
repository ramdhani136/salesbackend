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
    notes: {
      type: String,
      required: true,
    },
    img: {
      type: String,
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
    activeDate: {
      type: Date,
      required: true,
    },
    closingDate: {
      type: Date,
      require: true,
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

MemoModel.index({ name: 1, display: 1, status: 1, createdBy: 1 });

export default mongoose.model("tag", MemoModel);

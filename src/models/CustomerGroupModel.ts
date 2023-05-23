import mongoose, { Schema } from "mongoose";

const CustomerGroupModel = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    desc: {
      type: String,
    },
    parent: {
      _id: { type: Schema.Types.ObjectId, default: null },
      name: { type: String, default: null },
    },
    branch: {
      type: [Schema.Types.ObjectId],
      ref: "branch",
      required: true,
      validate: {
        validator: function (arr: any) {
          return arr.length > 0; // Memvalidasi bahwa array memiliki setidaknya satu elemen
        },
        message: "Array harus diisi setidaknya dengan satu tag.",
      },
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "Users",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["0", "1", "2"],
      default: "1",
      index: true,
    },
    workflowState: {
      type: String,
      required: true,
      default: "Submitted",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

CustomerGroupModel.index({ name: 1, status: 1, parent: 1, workflowState: 1 });

export default mongoose.model("customergroup", CustomerGroupModel);

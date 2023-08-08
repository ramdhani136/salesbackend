import mongoose, { Schema } from "mongoose";

const CustomerGroupModel = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
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
  },
  {
    timestamps: true,
  }
);

CustomerGroupModel.index({
  createdAt: -1,
});

CustomerGroupModel.index({
  name: 1,
});

CustomerGroupModel.index({
  branch: 1,
});

CustomerGroupModel.index({
  createdBy: 1,
});

CustomerGroupModel.index({
  status: 1,
});

CustomerGroupModel.index({
  workflowState: 1,
});

CustomerGroupModel.index({
  name: 1,
  branch: 1,
});

CustomerGroupModel.index({
  name: 1,
  branch: 1,
  status: 1,
});

CustomerGroupModel.index({
  updatedAt: -1,
});

export default mongoose.model("customergroup", CustomerGroupModel);

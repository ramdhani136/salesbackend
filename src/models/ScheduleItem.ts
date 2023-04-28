import mongoose, { Schema } from "mongoose";

const ScheduleItem = new mongoose.Schema(
  {
    schedule: {
      type: Object,
      required: true,
      index: true,
    },
    bin: {
      type: String,
      required: true,
    },
    uniqId: {
      type: String,
      required: true,
      unique: true,
    },
    item_code: {
      type: String,
      required: true,
      index:true
    },
    item_name: {
      type: String,
      required: true,
      index:true
    },
    kategori_barang: {
      type: String,
      index:true
    },
    stocker: {
      type: String,
      require: true,
      index:true
    },
    warehouse: {
      type: String,
      required: true,
      index:true
    },
    stock_uom: {
      type: String,
      required: true,
      default: 0,
      index:true
    },
    actual_qty: {
      type: Number,
      require: true,
      index:true
    },
    real_qty: {
      type: Number,
      default: 0,
      index:true
    },

    status: {
      type: String,
      required: true,
      default: 0,
      index:true
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("ScheduleItems", ScheduleItem);

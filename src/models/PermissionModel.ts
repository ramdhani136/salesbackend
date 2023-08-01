import mongoose, { Schema } from "mongoose";

const Permission = new mongoose.Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "Users",
      required: true,
      index: 1,
    },
    allow: {
      type: String,
      enum: ["branch", "user", "customer", "customergroup", "usergroup"],
      require: true,
      index: 1,
    },
    doc: {
      type: String,
      enum: [
        "branch",
        "visit",
        "callsheet",
        "",
        "customergroup",
        "customer",
        "roleprofile",
        "schedule",
        "memo",
        "contact",
        "usergroup",
        "notes"
      ],
      default: "",
      index: 1,
    },
    allDoc: {
      type: Boolean,
      index: 1,
      enum: [0, 1],
      default: 0,
    },
    value: {
      type: Schema.Types.ObjectId,
      require: true,
      index: 1,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "Users",
      required: true,
      index: 1,
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
  },
  {
    timestamps: true,
  }
);

Permission.index({
  createdAt: -1,
});
Permission.index({
  updatedAt: -1,
});

export default mongoose.model("Permissions", Permission);

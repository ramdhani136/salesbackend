import mongoose, { Schema } from "mongoose";

const Workflow = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      index: true,
      unique: true,
    },
    doc: {
      type: String,
      required: true,
      enum: [
        "visit",
        "callsheet",
        "branch",
        "schedule",
        "user",
        "contact",
        "customergroup",
        "customer",
        "roleprofile",
        "roleuser",
        "permission",
        "usergroup",
        "memo",
        "topic",
        "notes",
        "tag",
        "namingseries",
        "assesmentschedule"
      ],
      index: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
      ref: "Users",
    },
    status: {
      type: Boolean,
      default: 0,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

Workflow.index({
  createdAt: -1,
});
Workflow.index({
  updatedAt: -1,
});

export default mongoose.model("workflows", Workflow);

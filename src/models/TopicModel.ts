import mongoose, { Schema } from "mongoose";

const TopicModel = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      index: true,
      unique: true,
    },
    tags: {
      restrict: {
        type: [
          {
            type: Schema.Types.ObjectId,
            ref: "tag",
            required: true,
            index: true,
          },
        ],
      },
      mandatory: {
        type: [
          {
            type: Schema.Types.ObjectId,
            ref: "tag",
            required: true,
            index: true,
          },
        ],
      },
      allowTaggingItem: {
        type: Number,
        default: 1,
        enum: [0, 1],
      },
    },
    taskActive: {
      type: Number,
      default: 0,
      enum: [0, 1],
    },
    response: {
      isMandatory: {
        type: Number,
        default: 0,
        enum: [0, 1],
      },
      data: [
        {
          name: {
            type: String,
          },
        },
      ],
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: true,
      index: true,
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
  },

  {
    timestamps: true,
  }
);

TopicModel.index({
  createdAt: -1,
});
TopicModel.index({
  updatedAt: -1,
});

export default mongoose.model("topic", TopicModel);

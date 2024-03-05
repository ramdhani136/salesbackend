import mongoose, { Schema } from "mongoose";

const NotesModel = new mongoose.Schema(
  {
    task: {
      type: String,
    },
    doc: {
      type: {
        type: String,
        required: true,
        enum: ["visit", "callsheet"],
      },
      _id: {
        type: Schema.Types.ObjectId,
        required: true,
        index: true,
      },
      name: {
        type: String,
        required: true,
      },
      status: {
        type: String,
        required: true,
      },
      workflowState: {
        type: String,
        required: true,
      },
      callType: {
        type: String,
        enum: ["in", "out"],
        index: true,
      },
      checkOut: {
        createdAt: { type: Date, index: -1 },
        lat: {
          type: Number,
        },
        lng: {
          type: Number,
        },
        address: {
          type: String,
        },
      },
      checkIn: {
        createdAt: { type: Date, index: -1 },
        lat: {
          type: Number,
        },
        lng: {
          type: Number,
        },
        address: {
          type: String,
        },
      },
    },
    taskNotes: {
      type: [
        {
          type: {
            _id: {
              type: Schema.Types.ObjectId,
              required: true,
            },
            from: {
              type: String,
              enum: ["Memo", "Schedule"],
              required: true,
            },
            name: {
              type: String,
              required: true,
            },
            title: {
              type: String,
              required: true,
            },
            notes: {
              type: String,
              required: true,
            },
          },
          required: false,
        },
      ],
    },
    customer: {
      type: Schema.Types.ObjectId,
      ref: "customer",
      required: true,
    },
    topic: {
      type: Schema.Types.ObjectId,
      ref: "topic",
      required: true,
    },
    tags: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: "tag",
          required: true,
          index: 1,
        },
      ],
      // required: true,
      // validate: {
      //   validator: function (arr: any) {
      //     return arr.length > 0; // Memvalidasi bahwa array memiliki setidaknya satu elemen
      //   },
      //   message: "Array harus diisi setidaknya dengan satu tag.",
      // },
    },
    schedule: {
      name: String,
      desc: String,
    },
    result: {
      type: String,
      required: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    response: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

NotesModel.index({ customer: 1 });
NotesModel.index({ createdBy: 1 });
NotesModel.index({ topic: 1 });
NotesModel.index({ topic: 1, tags: 1, customer: 1 });
NotesModel.index({ topic: 1, tags: 1 });
NotesModel.index({ topic: 1, customer: 1 });
NotesModel.index({ customer: 1, topic: 1, tags: 1 });
NotesModel.index({ customer: 1, tags: 1 });
NotesModel.index({ customer: 1, topic: 1 });

NotesModel.index({
  createdAt: -1,
});
NotesModel.index({
  updatedAt: -1,
});

export default mongoose.model("notes", NotesModel);

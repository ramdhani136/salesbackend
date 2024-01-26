import mongoose, { Schema } from "mongoose";

const AssesmentScheduleList = new mongoose.Schema(
    {
        schedule: {
            type: Schema.Types.ObjectId,
            ref: "assesmentschedule",
            required: true,
            index: 1,
        },
        customer: {
            type: Schema.Types.ObjectId,
            ref: "customer",
            required: true,
            index: 1,
        },
        status: {
            type: String,
            enum: ["0", "1"],
            default: "0",
            index: 1,
        },
        closing: {
            date: {
                type: Date,
                index: -1,
            },
            user: {
                type: Schema.Types.ObjectId,
                ref: "Users",
            },
            result: {
                type: Schema.Types.ObjectId,
                ref: "assesmentresult",
            },
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

AssesmentScheduleList.index({
    createdAt: -1,
});
AssesmentScheduleList.index({
    updatedAt: -1,
});

export default mongoose.model("assesmentschedulelist", AssesmentScheduleList);

import { CallsheetModel, NotesModel, visitModel } from "./models";
import mongoose, { ConnectOptions } from "mongoose";

const connection = async () => {
  const options = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  };
  mongoose.set("strictQuery", false);
  mongoose.connect(
    // `mongodb://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}?authSource=admin`,
    `mongodb://127.0.0.1:27017/salesapp`,
    options as ConnectOptions
  );

  const db = mongoose.connection;
  db.on("error", (error: any) => console.log(error));
  db.on("open", () => console.log("Database Connected"));
};

const generateCallTypeNotes = async () => {
  const data = await CallsheetModel.find({}, [
    "_id",
    "type",
    "status",
    "workflowState",
    "name",
  ]);
  for (const item of data) {
    await NotesModel.updateMany(
      { "doc._id": item._id },
      {
        "doc.docType": item.type,
        "doc.status": item.status,
        "doc.workflowState": item.workflowState,
      }
    );
    console.log("Sukses " + item.name);
  }
};

const generateVisitType = async () => {
  const data = await visitModel.find({}, [
    "_id",
    "type",
    "status",
    "workflowState",
    "checkIn",
    "checkOut",
    "name",
  ]);
  for (const item of data) {
    console.log(item);

    let data: any = {
      "doc.docType": item.type,
      "doc.status": item.status,
      "doc.workflowState": item.workflowState,
    };

    if (item?.checkIn) {
      data.doc.checkIn = item.checkIn;
    }

    if (item?.checkOut) {
      data.doc.checkOut = item.checkOut;
    }

    await NotesModel.updateMany({ "doc._id": item._id }, data);
    console.log("Sukses " + item.name);
  }
};

const run = async () => {
  await connection();
  console.log("Callsheet");
  await generateCallTypeNotes();
  console.log("Visit");
  await generateVisitType();
};

run();

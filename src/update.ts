import { CallsheetModel, NotesModel } from "./models";
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
  const data = await CallsheetModel.find({}, ["_id", "type"]);
  for (const item of data) {
    await NotesModel.updateMany(
      { "doc._id": item._id },
      { "doc.callType": item.type }
    );
  }
};

const run = async () => {
  await connection();
  await generateCallTypeNotes();
};

run();

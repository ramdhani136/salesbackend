import {
  CallsheetModel,
  ConfigModel,
  ContactModel,
  CustomerModel,
  NotesModel,
  ScheduleListModel,
  visitModel,
} from "./models";
import mongoose, { ConnectOptions } from "mongoose";
import * as XLSX from "xlsx";
import * as fs from "fs";
import { ObjectId } from "mongodb";

const connection = async () => {
  const options = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  };
  mongoose.set("strictQuery", false);
  mongoose.connect(
    // `mongodb://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}?authSource=admin`,
    // `mongodb://127.0.0.1:27017/salesapp`,
    `mongodb://it:!Etms000!@193.203.162.240:27017/salesapp1?authSource=admin`,
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
    "createdAt",
  ]);
  for (const item of data) {
    await NotesModel.updateMany(
      { "doc._id": item._id },
      {
        "doc.docType": item.type,
        "doc.status": item.status,
        "doc.workflowState": item.workflowState,
        "doc.createdAt": item.createdAt,
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
    "createdAt",
  ]);
  for (const item of data) {
    let data: any = {
      "doc.docType": item.type,
      "doc.status": item.status,
      "doc.workflowState": item.workflowState,
      "doc.createdAt": item.createdAt,
    };

    if (item?.checkIn) {
      data["doc.checkIn"] = item.checkIn;
    }

    if (item?.checkOut) {
      data["doc.checkOut"] = item.checkOut;
    }

    await NotesModel.updateMany({ "doc._id": item._id }, data);
    console.log("Sukses " + item.name);
  }
};

const GenerateItem = async () => {
  try {
    const namaFile = "generateitem.xlsx";
    // Baca file Excel
    const workbook = XLSX.readFile(namaFile);

    // Ambil nama dari setiap sheet
    // const sheetNames = workbook.SheetNames;

    // UBAH
    const dataUbah: any[] = XLSX.utils.sheet_to_json(workbook.Sheets["ubah"]);

    for (const ubah of dataUbah) {
      const customer = await CustomerModel.findOne({ name: ubah.id }, [
        { name: 1 },
      ]);

      if (!customer) {
        console.log(ubah.name + " Tidak ditemukan!");
      } else {
        const data = {
          name: ubah.name,
          customerGroup: new ObjectId(ubah.group),
          workflowState: ubah.worflowState,
        };
        await CustomerModel.updateOne({ name: ubah.id }, data);
        console.log(ubah.name + " Sukses");
      }
    }
    //END UBAH

    // HAPUS

    // const dataHapus: any[] = XLSX.utils.sheet_to_json(workbook.Sheets["hapus"]);
    // for (const hapus of dataHapus) {
    //   const ada = await CustomerModel.findOne({ name: hapus.name }, [
    //     { _id: 1 },
    //   ]);

    //   if (!ada) {
    //     console.log(`${hapus.name} tidak ada!`);
    //   } else {
    //     // Cek Visit
    //     const visit = await visitModel.findOne(
    //       {
    //         customer: ada._id,
    //       },
    //       [{ id: 1 }]
    //     );

    //     if (!visit) {
    //       // Cek callsheet
    //       const callsheet = await CallsheetModel.findOne(
    //         {
    //           customer: ada._id,
    //         },
    //         [{ id: 1 }]
    //       );

    //       if (!callsheet) {
    //         // Cek callsheet
    //         const schedule = await ScheduleListModel.findOne(
    //           {
    //             customer: ada._id,
    //           },
    //           [{ id: 1 }]
    //         );

    //         if (!schedule) {
    //           const hasil = await CustomerModel.deleteOne({ _id: ada._id });
    //           console.log(hasil);
    //           const contact = await ContactModel.deleteMany({
    //             customer: ada._id,
    //           });
    //           console.log(contact);
    //           console.log(hapus.name + "  Sukses");
    //         } else {
    //           console.log(hapus.name + "  ada schedule");
    //         }
    //       } else {
    //         console.log(hapus.name + "  ada callsheet");
    //       }
    //     }
    //     // End
    //   }
    // }
    // END HAPUS

    // sheetNames.forEach(sheetName => {
    //   // Ambil sheet yang diinginkan
    //   const sheet = workbook.Sheets[sheetName];

    //   // Konversi sheet ke dalam bentuk JSON
    //   const data = XLSX.utils.sheet_to_json(sheet);

    //   console.log(`Isi dari sheet ${sheetName}:`);
    //   console.log(data);
    // });
  } catch (error) {
    console.log(error);
  }
};

const cekContact = async () => {
  try {
    let no = 0;
    const callsheet: any[] = await CallsheetModel.find({});
    let customers: any[] = [];
    for (const item of callsheet) {
      // if (item.contact) {
      //   const contact = await ContactModel.findOne({ _id: item.contact }, [
      //     { _id: 1 },
      //   ]);
      //   if (!contact) {
      //     console.log(`Tidak ada kontak ${item.name}`);
      //   }
      // }
      const customer = await CustomerModel.findOne({ _id: item.customer }, [
        { _id: 1 },
      ]);
      if (!customer) {
        console.log(`Tidak ada customer ${item.name}`);
        customers.push(item.name);
      }
      no += 1;
      console.log(no);
    }
    console.log(customers);
  } catch (error) {
    console.log(error);
  }
};

const run = async () => {
  await connection();
  await cekContact();
  // await GenerateItem();
  // console.log("Callsheet");
  // await generateCallTypeNotes();
  // console.log("Visit");
  // await generateVisitType();
  // console.log("selesai");

  // await ConfigModel.updateMany(
  //   {},
  //   {
  //     "visit.mandatoryCustScheduleNote": false,
  //     "callsheet.mandatoryCustScheduleNote": false,
  //   }
  // );
};

run();

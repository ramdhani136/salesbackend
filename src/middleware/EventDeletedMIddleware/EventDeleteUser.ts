import { NextFunction, Request, Response } from "express";
import {
  BranchModel,
  CallSheetNoteModel,
  CallsheetModel,
  VisitNoteModel,
  visitModel,
} from "../../models";
import { ObjectId } from "mongodb";
import UserModel from "../../models/UserModel";
import { Models } from "mongoose";

export const EventDeleteUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
  id: String
): Promise<any> => {
  const CheckData = async (Db: any, doc: string): Promise<any> => {
    const data = await Db.findOne({ createdBy: new ObjectId(`${id}`) });
    console.log(data);
    if (data) {
      res.status(400).json({
        status: 404,
        data: "Error , User terelasi dengan data branch",
      });
      return true;
    }
    return false;
  };

  // Cek branch
  // CheckData(BranchModel, "Branch");

  if (await CheckData(BranchModel, "Branch")) {
    return;
  }
  console.log('ddd')
  // const branch = await BranchModel.findOne({
  //   "createdBy._id": new ObjectId(`${id}`),
  // });
  // if (branch) {
  //   return res.status(400).json({
  //     status: 404,
  //     data: "Error , User terelasi dengan data branch",
  //   });
  // }
  // End Cek branch

  // Cek Callsheet
  const callsheet = await CallsheetModel.findOne({
    "createdBy._id": new ObjectId(`${id}`),
  });
  if (callsheet) {
    return res.status(400).json({
      status: 404,
      data: "Error , User terelasi dengan data callsheet",
    });
  }
  // End Cek Callsheet

  // Cek CallsheetNote
  const CallsheetNote = await CallSheetNoteModel.findOne({
    "createdBy._id": new ObjectId(`${id}`),
  });
  if (CallsheetNote) {
    return res.status(400).json({
      status: 404,
      data: "Error , User terelasi dengan data CallsheetNote",
    });
  }

  // Cek visit
  const visit = await visitModel.findOne({
    "createdBy._id": new ObjectId(`${id}`),
  });
  if (visit) {
    return res.status(400).json({
      status: 404,
      data: "Error , User terelasi dengan data visit",
    });
  }
  // End Cek visit

  // Cek visitNote
  const visitNote = await VisitNoteModel.findOne({
    "createdBy._id": new ObjectId(`${id}`),
  });
  if (visitNote) {
    return res.status(400).json({
      status: 404,
      data: "Error , User terelasi dengan data visitNote",
    });
  }
  // End Cek visit

  // return next();
};

import { NextFunction, Request, Response } from "express";
import { BranchModel, CallSheetNoteModel, CallsheetModel } from "../../models";
import { ObjectId } from "mongodb";

export const EventDeleteUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
  id: String
): Promise<any> => {
  const coba = await BranchModel.countDocuments(id);
  return res.status(400).json({
    status: 404,
    data: `${coba}`,
  });

  // Cek branch
  const branch = await BranchModel.findOne({
    "createdBy._id": new ObjectId(`${id}`),
  });
  if (branch) {
    return res.status(400).json({
      status: 404,
      data: "Error , User terelasi kedalam data branch",
    });
  }
  // End Cek branch

  // Cek Callsheet
  const callsheet = await CallsheetModel.findOne({
    "createdBy._id": new ObjectId(`${id}`),
  });
  if (callsheet) {
    return res.status(400).json({
      status: 404,
      data: "Error , User terelasi kedalam data callsheet",
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
      data: "Error , User terelasi kedalam data CallsheetNote",
    });
  }
  // End Cek CallsheetNote

  return next();
};

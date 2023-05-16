import { NextFunction, Request, Response } from "express";
import { CallsheetModel } from "../../models";
import { ObjectId } from "mongodb";

export const EventDeleteUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
  id: String
): Promise<any> => {
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

  return next();
};

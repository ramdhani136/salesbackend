import { NextFunction, Request, Response } from "express";
import {
  BranchModel,
  CallSheetNoteModel,
  CallsheetModel,
  VisitNoteModel,
  visitModel,
} from "../../models";

import { CheckData } from "../DeleteValidMiddleware";

export const EventDeleteUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
  id: String
): Promise<any> => {
  // Branch
  if (await CheckData(req, res, BranchModel, "Branch", ["createdBy"])) {
    return;
  }
  // End branch

  // Callsheet
  if (
    await CheckData(req, res, CallsheetModel, "Callsheet", ["createdBy._id"])
  ) {
    return;
  }

  // End Callsheet

  // CallsheetNote
  if (
    await CheckData(req, res, CallSheetNoteModel, "CallsheetNote", [
      "createdBy._id",
    ])
  ) {
    return;
  }
  // End CallsheetNote

  // Visit
  if (await CheckData(req, res, visitModel, "Visit", ["createdBy._id"])) {
    return;
  }
  // End Visit

  //  VisitNote
  if (
    await CheckData(req, res, VisitNoteModel, "VisitNote", ["createdBy._id"])
  ) {
    return;
  }
  // End  VisitNote

  // return next();
};

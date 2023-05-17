import { NextFunction, Request, Response } from "express";
import {
  CallSheetNoteModel,
  CallsheetModel,
  VisitNoteModel,
  visitModel,
} from "../../models";

import { CheckData } from "../DeleteValidMiddleware";

interface IData {
  model: any;
  doc: string;
  filters: string[];
}

export const EventDeleteContact = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  const data: IData[] = [
    {
      doc: "Callsheet",
      filters: ["contact._id"],
      model: CallsheetModel,
    },
    {
      doc: "CallsheetNote",
      filters: ["callsheet.contact._id"],
      model: CallSheetNoteModel,
    },
    {
      doc: "Visit",
      filters: ["contact._id"],
      model: visitModel,
    },
    {
      doc: "VisitNote",
      filters: ["callsheet.contact._id"],
      model: VisitNoteModel,
    },
  ];

  for (const i of data) {
    if (await CheckData(req, res, i.model, i.doc, i.filters)) {
      return;
    }
  }

  return next();
};
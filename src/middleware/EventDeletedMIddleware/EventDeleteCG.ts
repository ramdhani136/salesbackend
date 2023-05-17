import { NextFunction, Request, Response } from "express";
import {
  CallSheetNoteModel,
  CallsheetModel,
  ContactModel,
  CustomerModel,
  ScheduleListModel,
  VisitNoteModel,
  visitModel,
} from "../../models";

import { CheckData } from "../DeleteValidMiddleware";

interface IData {
  model: any;
  doc: string;
  filters: string[];
}

export const EventDeleteCGt = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  const data: IData[] = [
    {
      doc: "Callsheet",
      filters: ["customer.customerGroup._id"],
      model: CallsheetModel,
    },
    {
      doc: "CallsheetNote",
      filters: ["callsheet.customer.customerGroup._id"],
      model: CallSheetNoteModel,
    },
    {
      doc: "Contact",
      filters: ["customer.customerGroup._id"],
      model: ContactModel,
    },
    {
      doc: "Customer",
      filters: ["customerGroup._id"],
      model: CustomerModel,
    },
    {
      doc: "ScheduleList",
      filters: ["customer.customerGroup._id"],
      model: ScheduleListModel,
    },
    {
      doc: "Visit",
      filters: ["customer.customerGroup._id"],
      model: visitModel,
    },
    {
      doc: "VisitNote",
      filters: ["visit.customer.customerGroup._id"],
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

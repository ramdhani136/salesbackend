import { NextFunction, Request, Response } from "express";
import {
  CallSheetNoteModel,
  CallsheetModel,
  ContactModel,
  CustomerGroupModel,
  CustomerModel,
  ScheduleListModel,
  VisitNoteModel,
  namingSeriesModel,
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
      filters: ["customer.customerGroup.branch._id"],
      model: CallsheetModel,
    },
    {
      doc: "CallsheetNote",
      filters: ["callsheet.customer.customerGroup.branch._id"],
      model: CallSheetNoteModel,
    },
    {
      doc: "Contact",
      filters: ["customer.customerGroup.branch._id"],
      model: ContactModel,
    },
    {
      doc: "CustomerGroup",
      filters: ["branch"],
      model: CustomerGroupModel,
    },
    {
      doc: "Customer",
      filters: ["customerGroup.branch._id"],
      model: CustomerModel,
    },
    {
      doc: "NamingSeries",
      filters: ["branch"],
      model: namingSeriesModel,
    },
    {
      doc: "ScheduleList",
      filters: ["customer.customerGroup.branch._id"],
      model: ScheduleListModel,
    },
    {
      doc: "Visit",
      filters: ["customer.customerGroup.branch._id"],
      model: visitModel,
    },
    {
      doc: "VisitNote",
      filters: ["visit.customer.customerGroup.branch._id"],
      model: VisitNoteModel,
    },
  ];

  for (const i of data) {
    if (await CheckData(req, res, i.model, i.doc, i.filters)) {
      return;
    }
  }

  // return next();
};

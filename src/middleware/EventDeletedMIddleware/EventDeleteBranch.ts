import { NextFunction, Request, Response } from "express";
import {
  CallSheetNoteModel,
  CallsheetModel,
  ContactModel,
  CustomerGroupModel,
  CustomerModel,
  MemoModel,
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

export const EventDeleteBranch = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  const data: IData[] = [
    {
      doc: "Memo",
      filters: ["branch"],
      model: MemoModel,
    },
    {
      doc: "CustomerGroup",
      filters: ["branch"],
      model: CustomerGroupModel,
    },
    {
      doc: "Customer",
      filters: ["branch"],
      model: CustomerModel,
    },
    {
      doc: "NamingSeries",
      filters: ["branch"],
      model: namingSeriesModel,
    },
  ];

  for (const i of data) {
    if (await CheckData(req, res, i.model, i.doc, i.filters)) {
      return;
    }
  }

  return next();
};

import { NextFunction, Request, Response } from "express";
import {
  AssesmentScheduleList,
  CallsheetModel,
  ScheduleListModel,
  visitModel,
} from "../../models";

import { CheckData } from "../DeleteValidMiddleware";

interface IData {
  model: any;
  doc: string;
  filters: string[];
}

export const EventDeleteCustomer = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  const data: IData[] = [
    {
      doc: "Callsheet",
      filters: ["customer"],
      model: CallsheetModel,
    },
    {
      doc: "Visit",
      filters: ["customer._id"],
      model: visitModel,
    },
    {
      doc: "AssesmentScheduleList",
      filters: ["customer"],
      model: AssesmentScheduleList,
    },
    {
      doc: "Schedule List",
      filters: ["customer"],
      model: ScheduleListModel,
    },
  ];

  for (const i of data) {
    if (await CheckData(req, res, i.model, i.doc, i.filters)) {
      return;
    }
  }

  return next();
};

import { NextFunction, Request, Response } from "express";
import { CallsheetModel } from "../../models";

import { CheckData } from "../DeleteValidMiddleware";

interface IData {
  model: any;
  doc: string;
  filters: string[];
}

export const EventDeleteBranch = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<any> => {
  const data: IData[] = [
    {
      doc: "Callsheet",
      filters: ["createdBy._id", "schedule.createdBy._id"],
      model: CallsheetModel,
    },
  ];

  for (const i of data) {
    if (await CheckData(req, res, i.model, i.doc, i.filters)) {
      return;
    }
  }

  return next();
};

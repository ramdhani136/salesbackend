import { NextFunction, Request, Response } from "express";
// import { ScheduleModel } from "../../models";

import { CheckData } from "../DeleteValidMiddleware";
import { MemoModel } from "../../models";

interface IData {
  model: any;
  doc: string;
  filters: string[];
}

export const EventDeleteUserGroup = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  const data: IData[] = [
    {
      doc: "Memo",
      filters: ["userGroup"],
      model: MemoModel,
    },
  ];

  for (const i of data) {
    if (await CheckData(req, res, i.model, i.doc, i.filters)) {
      return;
    }
  }

  return next();
};

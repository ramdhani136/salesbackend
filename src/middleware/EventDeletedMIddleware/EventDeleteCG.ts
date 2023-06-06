import { NextFunction, Request, Response } from "express";
import { CustomerGroupModel, CustomerModel, MemoModel } from "../../models";

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
      doc: "Memo",
      filters: ["customerGroup"],
      model: MemoModel,
    },
    {
      doc: "Parent CustomerGroup",
      filters: ["parent._id"],
      model: CustomerGroupModel,
    },

    {
      doc: "Customer",
      filters: ["customerGroup"],
      model: CustomerModel,
    },
  ];

  for (const i of data) {
    if (await CheckData(req, res, i.model, i.doc, i.filters)) {
      return;
    }
  }

  return next();
};

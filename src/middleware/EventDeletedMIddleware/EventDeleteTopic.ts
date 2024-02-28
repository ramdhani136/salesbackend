import { NextFunction, Request, Response } from "express";
import {
  CallsheetModel,
  ConfigModel,
  ContactModel,
  CustomerGroupModel,
  CustomerModel,
  MemoModel,
  ScheduleListModel,
  namingSeriesModel,
  visitModel,
} from "../../models";

import { CheckData } from "../DeleteValidMiddleware";
import NotesModel from "../../models/NotesModel";

interface IData {
  model: any;
  doc: string;
  filters: string[];
}

export const EventDeleteTopic = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  const data: IData[] = [
    {
      doc: "Notes",
      filters: ["topic"],
      model: NotesModel,
    },
    {
      doc: "Config",
      filters: ["visit.topicsMandatory", "callsheet.topicsMandatory"],
      model: ConfigModel,
    },
  ];

  for (const i of data) {
    if (await CheckData(req, res, i.model, i.doc, i.filters)) {
      return;
    }
  }

  return next();
};

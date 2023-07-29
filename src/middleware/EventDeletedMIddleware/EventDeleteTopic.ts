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
  ];

  for (const i of data) {
    if (await CheckData(req, res, i.model, i.doc, i.filters)) {
      return;
    }
  }

  return next();
};

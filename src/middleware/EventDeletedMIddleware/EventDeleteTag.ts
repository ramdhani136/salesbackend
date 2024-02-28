import { NextFunction, Request, Response } from "express";
import {
  ConfigModel,
  TopicModel,
} from "../../models";

import { CheckData } from "../DeleteValidMiddleware";
import NotesModel from "../../models/NotesModel";

interface IData {
  model: any;
  doc: string;
  filters: string[];
}

export const EventDeleteTag = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  const data: IData[] = [
    {
      doc: "Config",
      filters: ["visit.tagsMandatory", "callsheet.tagsMandatory"],
      model: ConfigModel,
    },
    {
      doc: "Topic",
      filters: ["tags.mandatory", "tags.restrict"],
      model: TopicModel,
    },
    {
      doc: "Notes",
      filters: ["tags"],
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

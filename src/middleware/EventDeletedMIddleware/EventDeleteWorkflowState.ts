import { NextFunction, Request, Response } from "express";
import { WorkflowChanger, WorkflowTransition } from "../../models";

import { CheckData } from "../DeleteValidMiddleware";

interface IData {
  model: any;
  doc: string;
  filters: string[];
}

export const EventDeleteWorkflowState = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  const data: IData[] = [
    {
      doc: "WorkflowChanger",
      filters: ["state"],
      model: WorkflowChanger,
    },
    {
      doc: "WorkflowTransition",
      filters: ["stateActive", "nextState"],
      model: WorkflowTransition,
    },
  ];

  for (const i of data) {
    if (await CheckData(req, res, i.model, i.doc, i.filters)) {
      return;
    }
  }

  return next();
};

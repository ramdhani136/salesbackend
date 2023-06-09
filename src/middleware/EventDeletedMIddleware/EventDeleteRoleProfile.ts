import { NextFunction, Request, Response } from "express";
import {
  RoleUserModel,
  WorkflowChanger,
  WorkflowTransition,
} from "../../models";

import { CheckData } from "../DeleteValidMiddleware";

interface IData {
  model: any;
  doc: string;
  filters: string[];
}

export const EventDeleteRoleProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  const data: IData[] = [
    {
      doc: "RoleUser",
      filters: ["roleprofile"],
      model: RoleUserModel,
    },
    {
      doc: "WorkflowTransition",
      filters: ["roleprofile"],
      model: WorkflowTransition,
    },
    {
      doc: "WorkflowChanger",
      filters: ["roleprofile"],
      model: WorkflowChanger,
    },
  ];

  for (const i of data) {
    if (await CheckData(req, res, i.model, i.doc, i.filters)) {
      return;
    }
  }

  return next();
};

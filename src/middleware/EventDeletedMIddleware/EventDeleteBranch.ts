import { NextFunction, Request, Response } from "express";
import {
  BranchModel,
  CallSheetNoteModel,
  CallsheetModel,
  ChatModel,
  ContactModel,
  CustomerGroupModel,
  CustomerModel,
  History,
  MemoModel,
  MessageModel,
  PermissionModel,
  RoleListModel,
  RoleProfileModel,
  RoleUserModel,
  ScheduleListModel,
  ScheduleModel,
  TagModel,
  UserGroupListModel,
  UserGroupModel,
  VisitNoteModel,
  Workflow,
  WorkflowAction,
  WorkflowChanger,
  WorkflowState,
  WorkflowTransition,
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
  next: NextFunction,
  id: String
): Promise<any> => {
  const data: IData[] = [
    { doc: "Branch", filters: ["createdBy"], model: BranchModel },
  ];

  for (const i of data) {
    if (await CheckData(req, res, i.model, i.doc, i.filters)) {
      return;
    }
  }

  return next();
};

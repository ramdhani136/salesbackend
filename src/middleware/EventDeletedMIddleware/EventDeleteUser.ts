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

export const EventDeleteUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
  id: String
): Promise<any> => {
  const data: IData[] = [
    { doc: "Branch", filters: ["createdBy"], model: BranchModel },
    {
      doc: "Callsheet",
      filters: ["createdBy._id", "schedule.createdBy._id"],
      model: CallsheetModel,
    },
    {
      doc: "CallsheetNote",
      filters: ["callsheet.createdBy._id", "callsheet.schedule.createdBy._id"],
      model: CallSheetNoteModel,
    },
    {
      doc: "Visit",
      filters: ["createdBy._id", "schedule.createdBy._id"],
      model: visitModel,
    },
    {
      doc: "VisitNote",
      filters: ["visit.createdBy._id", "visit.schedule.createdBy._id"],
      model: VisitNoteModel,
    },
    {
      doc: "Contact",
      filters: ["createdBy._id"],
      model: ContactModel,
    },
    {
      doc: "Customer",
      filters: ["createdBy._id"],
      model: CustomerModel,
    },
    {
      doc: "Memo",
      filters: ["createdBy._id"],
      model: MemoModel,
    },
    {
      doc: "CustomerGroup",
      filters: ["createdBy"],
      model: CustomerGroupModel,
    },
    {
      doc: "History",
      filters: ["user"],
      model: History,
    },
    {
      doc: "Permission",
      filters: ["user", "createdBy"],
      model: PermissionModel,
    },
    {
      doc: "Rolelist",
      filters: ["createdBy"],
      model: RoleListModel,
    },
    {
      doc: "RoleProfile",
      filters: ["createdBy"],
      model: RoleProfileModel,
    },
    {
      doc: "RoleUser",
      filters: ["user", "createdBy"],
      model: RoleUserModel,
    },
    {
      doc: "ScheduleList",
      filters: ["schedule.createdBy._id", "createdBy._id"],
      model: ScheduleListModel,
    },
    {
      doc: "Schedule",
      filters: ["createdBy._id"],
      model: ScheduleModel,
    },
    {
      doc: "Tag",
      filters: ["createdBy._id"],
      model: TagModel,
    },
    {
      doc: "UserGroupList",
      filters: ["createdBy._id", "user._id"],
      model: UserGroupListModel,
    },
    {
      doc: "UserGroup",
      filters: ["createdBy._id"],
      model: UserGroupModel,
    },
    {
      doc: "Workflow",
      filters: ["user"],
      model: Workflow,
    },
    {
      doc: "WorkflowAction",
      filters: ["user"],
      model: WorkflowAction,
    },
    {
      doc: "WorkflowChanger",
      filters: ["user"],
      model: WorkflowChanger,
    },
    {
      doc: "workflowState",
      filters: ["user"],
      model: WorkflowState,
    },
    {
      doc: "workflowTransition",
      filters: ["user"],
      model: WorkflowTransition,
    },
    {
      doc: "Message",
      filters: ["sender"],
      model: MessageModel,
    },
    {
      doc: "Chat",
      filters: ["users", "groupAdmin"],
      model: ChatModel,
    },
  ];

  for (const i of data) {
    if (await CheckData(req, res, i.model, i.doc, i.filters)) {
      return;
    }
  }

  return next();
};

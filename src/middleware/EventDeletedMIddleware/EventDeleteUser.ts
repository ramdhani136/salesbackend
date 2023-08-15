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
  next: NextFunction
): Promise<any> => {
  const data: IData[] = [
    { doc: "Branch", filters: ["createdBy"], model: BranchModel },
    {
      doc: "Callsheet",
      filters: ["createdBy"],
      model: CallsheetModel,
    },
    {
      doc: "Visit",
      filters: ["createdBy"],
      model: visitModel,
    },
    {
      doc: "Contact",
      filters: ["createdBy"],
      model: ContactModel,
    },
    {
      doc: "Customer",
      filters: ["createdBy"],
      model: CustomerModel,
    },
    {
      doc: "Memo",
      filters: ["createdBy"],
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
      doc: "ScheduleList",
      filters: ["createdBy"],
      model: ScheduleListModel,
    },
    {
      doc: "ScheduleList",
      filters: ["closing.user._id", "closing.user"],
      model: ScheduleListModel,
    },
    {
      doc: "Schedule",
      filters: ["createdBy"],
      model: ScheduleModel,
    },
    {
      doc: "Tag",
      filters: ["createdBy"],
      model: TagModel,
    },
    {
      doc: "UserGroupList",
      filters: ["createdBy", "user"],
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

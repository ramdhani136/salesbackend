import { Request, Response, NextFunction } from "express";
import {
  EventDeleteBranch,
  EventDeleteCGt,
  EventDeleteContact,
  EventDeleteCustomer,
  EventDeleteRoleProfile,
  EventDeleteTag,
  EventDeleteTopic,
  EventDeleteUser,
  EventDeleteUserGroup,
  EventDeleteWorkflowAction,
  EventDeleteWorkflowState,
} from "./EventDeletedMIddleware";
import { ObjectId } from 'bson';

const CheckData = async (
  req: Request,
  res: Response,
  Db: any,
  doc: string,
  filter: String[]
): Promise<any> => {
  const path = req.path.replace(/\//g, "");
  if (filter.length > 0) {
    const isFilter = filter.map((item) => {
      let tempt: any = {};
      tempt[`${item}`] = new ObjectId(`${path}`);
      return tempt;
    });

    const data = await Db.findOne({ $or: isFilter });
    if (data) {
      res.status(400).json({
        status: 404,
        msg: `Error , Data terelasi dengan data ${doc}`,
      });
      return true;
    }
  } else {
    res.status(400).json({
      status: 404,
      msg: `filters harus diisi!`,
    });
    return true;
  }

  return false;
};

const DeletedValidMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    let doc: string = req.baseUrl.substring(1);

    switch (doc) {
      case "users":
        EventDeleteUser(req, res, next);
        break;
      case "branch":
        EventDeleteBranch(req, res, next);
        break;
      case "contact":
        EventDeleteContact(req, res, next);
        break;
      case "customergroup":
        EventDeleteCGt(req, res, next);
        break;
      case "customer":
        EventDeleteCustomer(req, res, next);
        break;
      case "tag":
        EventDeleteTag(req, res, next);
        break;
      case "roleprofile":
        EventDeleteRoleProfile(req, res, next);
        break;
      case "usergroup":
        EventDeleteUserGroup(req, res, next);
        break;
      // case "workflow":
      //   EventDeleteWorkflow(req, res, next);
      //   break;
      case "workflowstate":
        EventDeleteWorkflowState(req, res, next);
        break;
      case "workflowaction":
        EventDeleteWorkflowAction(req, res, next);
        break;
      case "topic":
        EventDeleteTopic(req, res, next);
        break;

      default:
        next();
        break;
    }
  } catch (error) {
    return res.status(404).json({ status: 404, msg: error });
  }
};

export { DeletedValidMiddleware, CheckData };

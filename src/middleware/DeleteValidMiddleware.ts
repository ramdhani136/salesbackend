import { Request, Response, NextFunction } from "express";
import {
  EventDeleteBranch,
  EventDeleteCGt,
  EventDeleteContact,
  EventDeleteUser,
} from "./EventDeletedMIddleware";
import { ObjectId } from "mongodb";

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
        data: `Error , Data terelasi dengan data ${doc}`,
      });
      return true;
    }
  } else {
    res.status(400).json({
      status: 404,
      data: `filters harus diisi!`,
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
    const path = req.path.replace(/\//g, "");
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

      default:
        next();
        break;
    }
  } catch (error) {
    return res.status(404).json({ status: 404, data: error });
  }
};

export { DeletedValidMiddleware, CheckData };

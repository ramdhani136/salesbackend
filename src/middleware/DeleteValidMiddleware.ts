import { Request, Response, NextFunction } from "express";
import { EventDeleteUser } from "./EventDeletedMIddleware";

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
        EventDeleteUser(req, res, next, path);
        break;

      default:
        next();
        break;
    }
  } catch (error) {
    return res.status(404).json({ status: 404, data: error });
  }
};

export default DeletedValidMiddleware;

import { Request, Response, NextFunction } from "express";

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
        console.log(req.baseUrl);
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

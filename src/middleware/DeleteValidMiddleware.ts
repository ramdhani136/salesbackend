import { Request, Response, NextFunction } from "express";

const DeletedValidMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const path = req.path.replace(/\//g, "");
    console.log(req.baseUrl);
    console.log(path);
  } catch (error) {
    return res.status(404).json({ status: 404, data: error });
  }
};

export default DeletedValidMiddleware;

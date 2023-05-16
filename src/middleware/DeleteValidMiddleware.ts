import { Request, Response, NextFunction } from "express";

class DeletedValidMiddleware {
  public validUser = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> => {
    try {
      next();
    } catch (error) {
      return res.status(404).json({ status: 404, data: error });
    }
  };
}

export default new DeletedValidMiddleware();

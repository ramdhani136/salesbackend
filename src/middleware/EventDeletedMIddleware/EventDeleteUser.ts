import { NextFunction, Request, Response } from "express";

export const EventDeleteUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
  id: String
): Promise<any> => {
  console.log(id);
  res.send('dd')
};

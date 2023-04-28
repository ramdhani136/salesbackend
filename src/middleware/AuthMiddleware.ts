import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export const AuthMiddleware = (
  req: Request | any,
  res: Response,
  next: NextFunction
): any => {
  const authHeader = req.header("authorization");
  const token = authHeader && authHeader.split(" ")[1];
  if (token == null)
    return res.status(401).json({
      status: 401,
      msg: "Unauthorized",
    });
  jwt.verify(
    token,
    `${process.env.ACCESS_TOKEN_SECRET}`,
    (err: any, decoded: any) => {
      if (err)
        return res.status(403).json({
          status: 403,
          msg: "Forbiden, you have to login to access the data!",
        });
      req.userId = decoded._id;
      req.username = decoded.username;
      req.user = decoded.name;
      next();
    }
  );
};

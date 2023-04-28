import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { RoleList, RoleUser } from "../models";

export const RoleValidation = (
  req: Request | any,
  res: Response,
  next: NextFunction
): any => {
  let doc: string = req.baseUrl.substring(1);
  const authHeader = req.header("authorization");
  const token = authHeader && authHeader.split(" ")[1];
  jwt.verify(
    token,
    `${process.env.ACCESS_TOKEN_SECRET}`,
    async (err: any, decoded: any): Promise<any> => {
      if (err)
        return res.status(403).json({
          status: 403,
          msg: "Forbiden, you have to login to access the data!",
        });

      const roleUser = await RoleUser.find({ user: decoded._id });
      const relate = [];
      if (roleUser.length > 0) {
        for (const role of roleUser) {
          const id = role.roleprofile;
          const data = await RoleList.findOne({
            $and: [{ roleprofile: id }, { doc: doc }],
          });
          if (data) {
            relate.push(data);
          }
        }
        if (relate.length > 0) {
          let ismethod = "read";
          switch (req.method) {
            case "POST":
              ismethod = "create";
              break;
            case "GET":
              ismethod = "read";
              break;
            case "PUT":
              ismethod = "update";
              break;
            case "DELETE":
              ismethod = "delete";
              break;
            default:
          }

          // console.log(relate)
          const valid = relate.filter(
            (item: any) => item[`${ismethod}`] == "1"
          );
          if (valid.length == 0) {
            return res.status(403).json({
              status: 403,
              msg: "Permission Denied!",
            });
          }
          next();
        } else {
          return res.status(403).json({
            status: 403,
            msg: "Permission Denied!",
          });
        }
      } else {
        return res.status(403).json({
          status: 403,
          msg: "Permission Denied!",
        });
      }
    }
  );
};

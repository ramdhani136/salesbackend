import { Request, Response, NextFunction } from "express";

import { RoleListModel, RoleUserModel } from "../models";

export const RoleMiddleware = async (
  req: Request | any,
  res: Response,
  next: NextFunction
): Promise<any> => {
  let doc: string = req.baseUrl.substring(1);

  const roleUser = await RoleUserModel.find({ user: req.userId });
  const relate = [];
  if (roleUser.length > 0) {
    for (const role of roleUser) {
      const id = role.roleprofile;
    
      const data = await RoleListModel.findOne({
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
      const valid = relate.filter((item: any) => item[`${ismethod}`] == "1");
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
  // }
  // );
};

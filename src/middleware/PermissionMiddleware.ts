import { PermissionModel } from "../models";
const { ObjectId } = require("mongodb");

export enum selPermissionAllow {
  BRANCH = "branch",
  CUSTOMERGROUP = "customergroup",
  CUSTOMER = "customer",
  USER = "user",
}

export enum selPermissionType {
  BRANCH = "branch",
  CUSTOMERGROUP = "customergroup",
  ROLEPROFILE = "roleprofile",
  ROLELIST = "rolelist",
  ROLEUSER = "roleuser",
  PERMISSION = "permission",
  CUSTOMER = "customer",
  CONTACT = "contact",
  MEMO = "memo",
  USERGROUP = "usergroup",
}

class PermissionMiddleware {
  public getPermission = async (
    userid: string,
    allow: selPermissionAllow,
    type: selPermissionType
  ): Promise<any[]> => {
    let data = await PermissionModel.find({
      $or: [
        { $and: [{ user: userid }, { allow: allow }, { allDoc: true }] },
        {
          $and: [
            { user: userid },
            { allow: allow },
            { allDoc: false },
            { doc: type },
          ],
        },
      ],
    });
    if (data.length > 0) {
      const isPemission = data.map((item: any) => {
        return item.value;
      });

      const uniqueData = isPemission
        .filter((item, index) => {
          return isPemission.indexOf(item) === index;
        })
        .map((id) => {
          return new ObjectId(id);
        });

      return uniqueData;
    }
    return [];
  };
}

export default new PermissionMiddleware();

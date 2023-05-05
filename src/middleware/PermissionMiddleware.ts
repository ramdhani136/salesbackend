import { PermissionModel } from "../models";
import { ObjectId } from "mongodb";

export enum selPermissionAllow {
  BRANCH = "branch",
  CUSTOMERGROUP = "customerGroup",
  CUSTOMER = "customer",
  USER = "user",
}

export enum selPermissionType {
  BRANCH = "branch",
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

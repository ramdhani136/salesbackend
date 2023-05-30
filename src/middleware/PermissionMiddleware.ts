import { all } from "axios";
import { PermissionModel, UserGroupListModel } from "../models";
import { ObjectId } from "mongodb";

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
  SCHEDULE = "schedule",
  CALLSHEET = "callsheet",
  VISIT = "visit",
  CALLSHEETNOTE = "callsheetnote",
  VISITNOTE = "visitnote",
}

class PermissionMiddleware {
  protected CompareObject = (objectId1: any, objectId2: any) => {
    return objectId1.toString() === objectId2.toString();
  };

  protected CheckDuplicateObjectId = (data: ObjectId[]): ObjectId[] => {
    const filter = data.filter((value, index, self) => {
      return self.findIndex((obj) => this.CompareObject(obj, value)) === index;
    });
    return filter;
  };

  public getPermission = async (
    userid: string,
    allow: selPermissionAllow,
    type: selPermissionType
  ): Promise<any[]> => {
    let finalPermission: any[] = [];

    let data = await PermissionModel.find({
      $and: [
        {
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
        },
        { status: "1" },
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

      finalPermission = uniqueData;
    }

    // Jika allow User
    if (allow === "user") {
      const userGroup = await PermissionModel.find(
        {
          $and: [
            {
              $or: [
                {
                  $and: [
                    { user: userid },
                    { allow: "usergroup" },
                    { allDoc: true },
                  ],
                },
                {
                  $and: [
                    { user: userid },
                    { allow: "usergroup" },
                    { allDoc: false },
                    { doc: type },
                  ],
                },
              ],
            },
            { status: "1" },
          ],
        },
        { value: 1 }
      );

      if (userGroup.length > 0) {
        const userGroupFil = userGroup.map((item) => {
          return new ObjectId(item.value);
        });
        const getList = await UserGroupListModel.find(
          {
            userGroup: { $in: userGroupFil },
          },
          { user: 1 }
        );

        if (getList.length > 0) {
          const userFrmUserGroup = getList.map((item) => {
            return item.user;
          });

          const merg = [...finalPermission, ...userFrmUserGroup];

          const uniqueData = this.CheckDuplicateObjectId(merg);
          finalPermission = uniqueData;
        }
      }
    }
    // End

    // Jika allow customerGroup

    // End

    console.log(finalPermission);
    return finalPermission;
  };
}

export default new PermissionMiddleware();

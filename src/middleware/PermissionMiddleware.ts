import { all } from "axios";
import {
  CustomerGroupModel,
  PermissionModel,
  UserGroupListModel,
} from "../models";
import { ObjectId } from 'bson';

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
  CUSTOMER = "customer",
  CONTACT = "contact",
  MEMO = "memo",
  SCHEDULE = "schedule",
  CALLSHEET = "callsheet",
  VISIT = "visit",
  USERGROUP = "usergroup",
  USER = "user",
  NOTES = "notes",
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
    if (allow === "customergroup") {
      const result: any = await CustomerGroupModel.aggregate([
        {
          $match: { _id: { $in: finalPermission } },
        },
        {
          $project: {
            parent: 1,
          },
        },
        {
          $graphLookup: {
            from: "customergroups",
            startWith: "$_id",
            connectFromField: "_id",
            connectToField: "parent._id",
            as: "childs",
            restrictSearchWithMatch: {},
          },
        },
        {
          $project: {
            "childs._id": 1,
          },
        },
      ]);

      if (result.length > 0) {
        let finalCG: any[] = [];
        const isCGFil = result.map((item: any) => {
          if (item.childs.length > 0) {
            let getChild = item.childs.map((ic: any) => {
              return ic._id;
            });
            finalCG = [...finalCG, ...getChild];
          }
          return item._id;
        });

        const merg = [...isCGFil, ...finalCG];

        const uniqueData = this.CheckDuplicateObjectId(merg);
        finalPermission = uniqueData;
      }
    }
    // End

    return finalPermission;
  };

  getCustomerChild = async (data: ObjectId[]): Promise<any[]> => {
    const result: any = await CustomerGroupModel.aggregate([
      {
        $match: { _id: { $in: data } },
      },
      {
        $project: {
          parent: 1,
        },
      },
      {
        $graphLookup: {
          from: "customergroups",
          startWith: "$_id",
          connectFromField: "_id",
          connectToField: "parent._id",
          as: "childs",
          restrictSearchWithMatch: {},
        },
      },
      {
        $project: {
          "childs._id": 1,
        },
      },
    ]);

    if (result.length > 0) {
      let finalCG: any[] = [];
      const isCGFil = result.map((item: any) => {
        if (item.childs.length > 0) {
          let getChild = item.childs.map((ic: any) => {
            return ic._id;
          });
          finalCG = [...finalCG, ...getChild];
        }
        return item._id;
      });

      const merg = [...isCGFil, ...finalCG];

      const uniqueData = this.CheckDuplicateObjectId(merg);
      return uniqueData;
    }
    return [];
  };
}

export default new PermissionMiddleware();

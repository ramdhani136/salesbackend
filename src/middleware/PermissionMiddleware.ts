import { PermissionModel } from "../models";

// export enum permissionType {
//     SCHEDULE = "schedule",
//     SCHEDULEITEM = "scheduleitem",
//     WAREHOUSE = "warehouse",
//     PACKING = "schedulepacking",
//     PACKINGID = "packingid",
//     USERS = "users",
//     CHAT = "chat",
//     MESSAGE = "message",
//     WORKFLOW = "workflow",
//     ROLEPROFILE = "roleprofile",
//   }

class PermissionMiddleware {
  public getUserPemission = async (
    userid: string,
    type: string
  ): Promise<any> => {
    let data = await PermissionModel.find({
      $or: [
        { $and: [{ user: userid }, { allow: "user" }, { allDoc: true }] },
        {
          $and: [
            { user: userid },
            { allow: "user" },
            { allDoc: false },
            { doc: type },
          ],
        },
      ],
    });
    if (data.length > 0) {
      const isPemission = data.map((item: any) => {
        return `user:${item.value}`;
      });

      let final:any
    //   final.d = isPemission;
      console.log(isPemission);
    }
  };
}

export default new PermissionMiddleware();

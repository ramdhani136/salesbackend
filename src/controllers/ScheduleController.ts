import { Request, Response } from "express";
import Redis from "../config/Redis";
import { IStateFilter } from "../Interfaces";
import {
  CekKarakterSama,
  FilterQuery,
  HapusKarakter,
  PaddyData,
  cekValidPermission,
} from "../utils";
import IController from "./ControllerInterface";
import { TypeOfState } from "../Interfaces/FilterInterface";
import {
  CallsheetModel,
  ScheduleModel as Db,
  History,
  ScheduleListModel,
  // UserGroupListModel,
  // UserGroupModel,
  namingSeriesModel,
  visitModel,
} from "../models";
import { PermissionMiddleware } from "../middleware";
import {
  selPermissionAllow,
  selPermissionType,
} from "../middleware/PermissionMiddleware";
import { ObjectId } from "mongodb";
import HistoryController from "./HistoryController";
import WorkflowController from "./WorkflowController";
import { ISearch } from "../utils/FilterQuery";

const redisName = "schedule";

class ScheduleController implements IController {
  index = async (req: Request | any, res: Response): Promise<Response> => {
    const stateFilter: IStateFilter[] = [
      {
        alias: "Id",
        name: "_id",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
      },
      {
        alias: "Name",
        name: "name",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
        isSort: true,
      },
      {
        alias: "Type",
        name: "type",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
        isSort: true,
      },
      // {
      //   alias: "UserGroup",
      //   name: "userGroup",
      //   operator: ["=", "!="],
      //   typeOf: TypeOfState.String,
      // },
      {
        alias: "CreatedBy",
        name: "createdBy",
        operator: ["=", "!="],
        typeOf: TypeOfState.String,
      },
      {
        alias: "Status",
        name: "status",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
        isSort: true,
      },
      {
        alias: "WorkflowState",
        name: "workflowState",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
        isSort: true,
      },

      {
        alias: "ActiveDate",
        name: "activeDate",
        operator: ["=", "!=", "like", "notlike", ">", "<", ">=", "<="],
        typeOf: TypeOfState.Date,
        isSort: true,
      },
      {
        alias: "ClosingDate",
        name: "closingDate",
        operator: ["=", "!=", "like", "notlike", ">", "<", ">=", "<="],
        typeOf: TypeOfState.Date,
        isSort: true,
      },
      {
        alias: "CreatedAt",
        name: "createdAt",
        operator: ["=", "!=", "like", "notlike", ">", "<", ">=", "<="],
        typeOf: TypeOfState.Date,
        isSort: true,
      },
      {
        alias: "UpdatedAt",
        name: "updatedAt",
        operator: ["=", "!=", "like", "notlike", ">", "<", ">=", "<="],
        typeOf: TypeOfState.Date,
        isSort: true,
      },
    ];
    try {
      const filters: any = req.query.filters
        ? JSON.parse(`${req.query.filters}`)
        : [];
      const fields: any = req.query.fields
        ? JSON.parse(`${req.query.fields}`)
        : [
            "name",
            "type",
            "createdBy",
            "updatedAt",
            "userGroup",
            "activeDate",
            "closingDate",
            "status",
            "workflowState",
          ];
      const order_by: any = req.query.order_by
        ? JSON.parse(`${req.query.order_by}`)
        : { updatedAt: -1 };
      const limit: number | string = parseInt(`${req.query.limit}`) || 0;
      let page: number | string = parseInt(`${req.query.page}`) || 1;
      let setField = FilterQuery.getField(fields);
      let search: ISearch = {
        filter: ["name", "type"],
        value: req.query.search || "",
      };
      let isFilter = FilterQuery.getFilter(filters, stateFilter, search, [
        "createdBy",
        "_id",
        // "userGroup",
      ]);

      // Mengambil rincian permission user
      const userPermission = await PermissionMiddleware.getPermission(
        req.userId,
        selPermissionAllow.USER,
        selPermissionType.SCHEDULE
      );
      // End

      if (!isFilter.status) {
        return res
          .status(400)
          .json({ status: 400, msg: "Error, Filter Invalid " });
      }
      // End

      let FinalFIlter: any = {};
      FinalFIlter[`$and`] = [isFilter.data];

      // if (userPermission.length > 0) {
      //   FinalFIlter[`$and`].push({
      //     createdBy: { $in: userPermission.map((id) => new ObjectId(id)) },
      //   });
      // }

      // // Cek permission usergroup
      // const userGroup = await UserGroupListModel.find(
      //   {
      //     user: new ObjectId(req.userId),
      //   },
      //   { userGroup: 1 }
      // );

      // const validPermission = userGroup.map((item) => {
      //   return item.userGroup;
      // });

      let pipeline: any[] = [
        // {
        //   $or: [
        //     { createdBy: new ObjectId(req.userId) },
        //     { userGroup: { $in: validPermission } },
        //   ],
        // },
        FinalFIlter,
      ];
      // End

      // Cek permission user
      if (userPermission.length > 0) {
        pipeline.unshift({
          $or: [
            {
              createdBy: { $in: userPermission.map((id) => new ObjectId(id)) },
            },
            { createdBy: new ObjectId(req.userId) },
          ],
        });
      }
      // End

      const getAll = await Db.find({ $and: pipeline }, setField).count();

      const result = await Db.find({ $and: pipeline }, setField)
        .sort(order_by)
        .limit(limit)
        .skip(limit > 0 ? page * limit - limit : 0)
        // .populate("userGroup", "name")
        .populate("createdBy", "name");

      if (result.length > 0) {
        return res.status(200).json({
          status: 200,
          total: getAll,
          limit,
          nextPage: getAll > page * limit && limit > 0 ? page + 1 : page,
          hasMore: getAll > page * limit && limit > 0 ? true : false,
          data: result,
          filters: stateFilter,
        });
      }
      return res.status(400).json({
        status: 404,
        msg: "Data tidak ditemukan!",
      });
    } catch (error: any) {
      return res.status(400).json({
        status: 400,
        msg: Object.keys(error).length > 0 ? error : "Error,Invalid Request",
      });
    }
  };

  create = async (req: Request | any, res: Response): Promise<Response> => {
    if (!req.body.type) {
      return res
        .status(400)
        .json({ status: 400, msg: "Error, type wajib diisi!" });
    }
    if (!req.body.notes) {
      return res
        .status(400)
        .json({ status: 400, msg: "Error, notes wajib diisi!" });
    }

    if (!req.body.activeDate) {
      return res
        .status(400)
        .json({ status: 400, msg: "Error, activeDate wajib diisi!" });
    }
    if (!req.body.closingDate) {
      return res
        .status(400)
        .json({ status: 400, msg: "Error, closingDate wajib diisi!" });
    }

    try {
      // Set nama/nomor doc
      // Cek naming series

      if (!req.body.namingSeries) {
        return res
          .status(400)
          .json({ status: 400, msg: "Error, namingSeries wajib diisi!" });
      }

      if (typeof req.body.namingSeries !== "string") {
        return res.status(404).json({
          status: 404,
          msg: "Error, Cek kembali data namingSeries, Data harus berupa string id namingSeries!",
        });
      }

      const namingSeries: any = await namingSeriesModel.findOne({
        $and: [{ _id: req.body.namingSeries }, { doc: "schedule" }],
      });

      if (!namingSeries) {
        return res
          .status(400)
          .json({ status: 400, msg: "Error, namingSeries tidak ditemukan!" });
      }

      //End

      const split = namingSeries.name.split(".");

      const jumlahKarakter = HapusKarakter(namingSeries.name, ["."]).length;

      let ambilIndex: String = "";
      const olahKata = split.map((item: any) => {
        if (item === "YYYY") {
          return new Date().getFullYear().toString();
        } else if (item === "MM") {
          return PaddyData(new Date().getMonth() + 1, 2).toString();
        } else {
          if (item.includes("#")) {
            if (CekKarakterSama(item)) {
              if (!ambilIndex) {
                if (item.length > 2) {
                  ambilIndex = item;
                }
              }
              return "";
            }
          }

          return item;
        }
      });

      let latest = 0;

      const regex = new RegExp(olahKata.join(""), "i");

      const doc = await Db.findOne({
        $and: [
          { name: { $regex: regex } },
          {
            $where: `this.name.length === ${
              ambilIndex ? jumlahKarakter : jumlahKarakter + 4
            }`,
          },
        ],
      })
        .sort({ createdAt: -1 })
        .exec();

      if (doc) {
        latest = parseInt(
          `${doc.name.slice(ambilIndex ? -ambilIndex.length : -4)}`
        );
      }

      req.body.name = ambilIndex
        ? olahKata.join("") +
          PaddyData(latest + 1, ambilIndex.length).toString()
        : olahKata.join("") + PaddyData(latest + 1, 4).toString();
      // End set name

      // //Mengecek userGroup
      // if (!req.body.userGroup) {
      //   return res
      //     .status(400)
      //     .json({ status: 400, msg: "Error, userGroup wajib diisi!" });
      // }
      // if (typeof req.body.userGroup !== "string") {
      //   return res.status(404).json({
      //     status: 404,
      //     msg: "Error, Cek kembali data userGroup, Data harus berupa string id userGroup!",
      //   });
      // }

      // const cekUserGroup: any = await UserGroupModel.findOne({
      //   $and: [{ _id: req.body.userGroup }],
      // });

      // if (!cekUserGroup) {
      //   return res.status(404).json({
      //     status: 404,
      //     msg: "Error, userGroup tidak ditemukan!",
      //   });
      // }

      // if (cekUserGroup.status != 1) {
      //   return res.status(404).json({
      //     status: 404,
      //     msg: "Error, userGroup tidak aktif!",
      //   });
      // }
      // // End

      // End

      req.body.createdBy = req.userId;
      const result = new Db(req.body);
      const response: any = await result.save();

      // push history
      await HistoryController.pushHistory({
        document: {
          _id: response._id,
          name: response.name,
          type: redisName,
        },
        message: `${req.user} menambahkan schedule ${response.name} `,
        user: req.userId,
      });
      // End

      return res.status(200).json({ status: 200, data: response });
    } catch (error) {
      return res
        .status(400)
        .json({ status: 400, msg: error ?? "Error Connection!" });
    }
  };

  show = async (req: Request | any, res: Response): Promise<Response> => {
    try {
      const cache = await Redis.client.get(`${redisName}-${req.params.id}`);

      if (cache) {
        const isCache = JSON.parse(cache);

        const cekPermission = await cekValidPermission(
          req.userId,
          {
            user: isCache.createdBy._id,
          },
          selPermissionType.SCHEDULE
        );

        if (!cekPermission) {
          if (`${req.userId}` !== `${isCache.createdBy._id}`) {
            return res.status(403).json({
              status: 403,
              msg: "Anda tidak mempunyai akses untuk dok ini!",
            });
          }
        }

        // const userGroupId = isCache.userGroup._id;
        // const userId = isCache.createdBy._id;

        // const validUser = await UserGroupListModel.findOne(
        //   {
        //     $and: [{ userGroup: userGroupId }, { user: req.userId }],
        //   },
        //   { _id: 1 }
        // );

        // if (!validUser && `${userId}` !== `${req.userId}`) {
        //   return res.status(404).json({
        //     status: 403,
        //     msg: "Anda tidak memiliki akses untuk dokumen ini!",
        //   });
        // }

        const getHistory = await History.find(
          {
            $and: [
              { "document._id": `${isCache._id}` },
              { "document.type": redisName },
            ],
          },

          ["_id", "message", "createdAt", "updatedAt"]
        )
          .populate("user", "name")
          .sort({ createdAt: -1 });

        const buttonActions = await WorkflowController.getButtonAction(
          redisName,
          req.userId,
          isCache.workflowState
        );
        return res.status(200).json({
          status: 200,
          data: JSON.parse(cache),
          history: getHistory,
          workflow: buttonActions,
        });
      }

      const result: any = await Db.findOne({
        _id: req.params.id,
      })
        // .populate("userGroup", "name")
        .populate("createdBy", "name");

      if (!result) {
        return res
          .status(404)
          .json({ status: 404, msg: "Error, Data tidak ditemukan!" });
      }

      // Cek Permission user

      const cekPermission = await cekValidPermission(
        req.userId,
        {
          user: result.createdBy._id,
        },
        selPermissionType.SCHEDULE
      );

      if (!cekPermission) {
        if (`${req.userId}` !== `${result.createdBy._id}`) {
          return res.status(403).json({
            status: 403,
            msg: "Anda tidak mempunyai akses untuk dok ini!",
          });
        }
      }

      // End

      // const userGroupId = result.userGroup._id;
      // const userId = result.createdBy._id;

      // const validUser = await UserGroupListModel.findOne(
      //   {
      //     $and: [{ userGroup: userGroupId }, { user: req.userId }],
      //   },
      //   { _id: 1 }
      // );

      // if (!validUser && `${userId}` !== `${req.userId}`) {
      //   return res.status(404).json({
      //     status: 403,
      //     msg: "Anda tidak memiliki akses untuk dokumen ini!",
      //   });
      // }

      const buttonActions = await WorkflowController.getButtonAction(
        redisName,
        req.userId,
        result.workflowState
      );

      const getHistory = await History.find(
        {
          $and: [
            { "document._id": result._id },
            { "document.type": redisName },
          ],
        },
        ["_id", "message", "createdAt", "updatedAt"]
      )
        .populate("user", "name")
        .sort({ createdAt: -1 });

      await Redis.client.set(
        `${redisName}-${req.params.id}`,
        JSON.stringify(result)
      );

      return res.status(200).json({
        status: 200,
        data: result,
        history: getHistory,
        workflow: buttonActions,
      });
    } catch (error) {
      return res.status(404).json({ status: 404, data: error });
    }
  };

  update = async (req: Request | any, res: Response): Promise<Response> => {
    // Cek data yang tidak boleh dirubah
    if (req.body.createdBy) {
      return res.status(404).json({
        status: 404,
        msg: "Error, createdby tidak dapat dirubah",
      });
    }
    if (req.body.name) {
      return res.status(404).json({
        status: 404,
        msg: "Error, tidak dapat merubah name!",
      });
    }
    // End

    try {
      const result: any = await Db.findOne({
        _id: req.params.id,
      })
        // .populate("userGroup", "name")
        .populate("createdBy", "name");

      if (result) {
        // Cek Permission user

        const cekPermission = await cekValidPermission(
          req.userId,
          {
            user: result.createdBy._id,
          },
          selPermissionType.SCHEDULE
        );

        if (!cekPermission) {
          if (`${req.userId}` !== `${result.createdBy._id}`) {
            return res.status(403).json({
              status: 403,
              msg: "Anda tidak mempunyai akses untuk dok ini!",
            });
          }
        }

        // const userGroupId = result.userGroup._id;
        // const userId = result.createdBy._id;

        // const validUser = await UserGroupListModel.findOne(
        //   {
        //     $and: [{ userGroup: userGroupId }, { user: req.userId }],
        //   },
        //   { _id: 1 }
        // );

        // if (!validUser && `${userId}` !== `${req.userId}`) {
        //   return res.status(404).json({
        //     status: 403,
        //     msg: "Anda tidak memiliki akses untuk dokumen ini!",
        //   });
        // }
        // End

        // Jika type diedit dan hanya bisa edit ketika belum ada schedulelist yang di close

        const scheduleList = await ScheduleListModel.findOne({
          $and: [
            { "schedule._id": req.params.id },
            {
              status: { $ne: "0" },
            },
          ],
        });

        if (scheduleList) {
          return res.status(404).json({
            status: 404,
            msg: "Error,tidak dapat merubah type karena sudah ada schedulelist yang close!",
          });
        }

        // End

        // //Mengecek userGroup
        // if (req.body.usergroup) {
        //   if (typeof req.body.userGroup !== "string") {
        //     return res.status(404).json({
        //       status: 404,
        //       msg: "Error, Cek kembali data userGroup, Data harus berupa string id userGroup!",
        //     });
        //   }

        //   const cekUserGroup: any = await UserGroupModel.findOne({
        //     $and: [{ _id: req.body.userGroup }],
        //   });

        //   if (!cekUserGroup) {
        //     return res.status(404).json({
        //       status: 404,
        //       msg: "Error, userGroup tidak ditemukan!",
        //     });
        //   }

        //   if (cekUserGroup.status != 1) {
        //     return res.status(404).json({
        //       status: 404,
        //       msg: "Error, userGroup tidak aktif!",
        //     });
        //   }
        //   // End

        //   // set setUserGroup
        //   req.body.userGroup = {
        //     _id: cekUserGroup._id,
        //     name: cekUserGroup.name,
        //   };
        //   // End
        // }

        // End

        if (req.body.nextState) {
          const checkedWorkflow =
            await WorkflowController.permissionUpdateAction(
              redisName,
              req.userId,
              req.body.nextState,
              result.createdBy
            );

          if (checkedWorkflow.status) {
            await Db.updateOne(
              { _id: req.params.id },
              checkedWorkflow.data
            ).populate("createdBy", "name");
          } else {
            return res
              .status(403)
              .json({ status: 403, msg: checkedWorkflow.msg });
          }
        } else {
          await Db.updateOne({ _id: req.params.id }, req.body).populate(
            "createdBy",
            "name"
          );
        }

        const getData: any = await Db.findOne({
          _id: req.params.id,
        })
          // .populate("userGroup", "name")
          .populate("createdBy", "name");

        // Update scheduleList
        await ScheduleListModel.updateMany(
          { "schedule._id": new ObjectId(req.params.id) },
          { schedule: getData }
        );
        // End

        await Redis.client.set(
          `${redisName}-${req.params.id}`,
          JSON.stringify(getData),
          {
            EX: 30,
          }
        );

        // push history semua field yang di update
        await HistoryController.pushUpdateMany(
          result,
          getData,
          req.user,
          req.userId,
          redisName
        );

        return res.status(200).json({ status: 200, data: getData });
        // End
      } else {
        return res
          .status(400)
          .json({ status: 404, msg: "Error update, Tidak ditemukan!" });
      }
    } catch (error: any) {
      return res.status(404).json({ status: 404, data: error });
    }
  };

  delete = async (req: Request | any, res: Response): Promise<any> => {
    try {
      const getData: any = await Db.findOne(
        { _id: req.params.id },
        { userGroup: 1, createdBy: 1 }
      );

      if (!getData) {
        return res
          .status(404)
          .json({ status: 404, msg: "Error, Data tidak ditemukan!" });
      }

      if (getData.status === "1") {
        return res
          .status(404)
          .json({ status: 404, msg: "Error, status dokumen aktif!" });
      }

      const cekPermission = await cekValidPermission(
        req.userId,
        {
          user: getData.createdBy,
        },
        selPermissionType.SCHEDULE
      );

      if (!cekPermission) {
        if (`${req.userId}` !== `${getData.createdBy}`) {
          return res.status(403).json({
            status: 403,
            msg: "Anda tidak mempunyai akses untuk dok ini!",
          });
        }
      }
      // const userGroupId = getData.userGroup;
      // const userId = getData.createdBy;

      // const validUser = await UserGroupListModel.findOne(
      //   {
      //     $and: [{ userGroup: userGroupId }, { user: req.userId }],
      //   },
      //   { _id: 1 }
      // );

      // if (!validUser && `${userId}` !== `${req.userId}`) {
      //   return res.status(404).json({
      //     status: 403,
      //     msg: "Anda tidak memiliki akses untuk dokumen ini!",
      //   });
      // // }
      // const result = await Db.deleteOne({ _id: req.params.id });
      // await Redis.client.del(`${redisName}-${req.params.id}`);
      // Delete Child
      await this.DeletedRelateChild(new ObjectId(req.params.id));
      //End;
      return res.status(200).json({ status: 200, data: "result" });
    } catch (error) {
      return res.status(404).json({ status: 404, msg: error });
    }
  };

  protected DeletedRelateChild = async (id: ObjectId): Promise<any> => {
    // schedulelist
    try {
      const schedulelist = await ScheduleListModel.find({
        schedule: new ObjectId(id),
      }).populate("schedule", "name type");

      if (schedulelist.length > 0) {
        for (const item of schedulelist) {
          let schedule: any = item.schedule;

          // Update Visit
          if (item.status !== "0" && schedule.type === "visit") {
            const visit = await visitModel.find(
              {
                schedulelist: { $in: [item._id] },
              },
              { schedulelist: 1 }
            );

            if (visit.length > 0) {
              for (const visitItem of visit) {
                let visitId = visitItem._id;
                let schedulelist = visitItem.schedulelist.filter((i: any) => {
                  return i.toString() !== item._id.toString();
                });

                await visitModel.findByIdAndUpdate(visitId, {
                  schedulelist: schedulelist,
                });
              }
            }
          }
          // End

          // Update Visit
          console.log(item);
          if (item.status !== "0" && schedule.type === "callsheet") {
            const callsheet = await CallsheetModel.find(
              {
                schedulelist: { $in: [item._id] },
              },
              { schedulelist: 1 }
            );

            // if (callsheet.length > 0) {
            //   for (const callsheetItem of callsheet) {
            //     let callsheetId = callsheetItem._id;
            //     let schedulelist = callsheetItem.schedulelist.filter(
            //       (i: any) => {
            //         return i.toString() !== item._id.toString();
            //       }
            //     );

            //     await CallsheetModel.findByIdAndUpdate(callsheetId, {
            //       schedulelist: schedulelist,
            //     });
            //   }
            // }
          }
          // End

          // Hapus schedulelist
          await ScheduleListModel.findByIdAndDelete(item._id);
          // End
        }
      }
    } catch (error) {
      throw error;
    }
    // End
  };
}

export default new ScheduleController();

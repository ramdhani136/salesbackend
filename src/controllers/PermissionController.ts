import { Request, Response } from "express";
// import Redis from "../config/Redis";
import { IStateFilter } from "../Interfaces";
import { FilterQuery, cekValidPermission } from "../utils";
import IController from "./ControllerInterface";
import { History, PermissionModel } from "../models";
import { TypeOfState } from "../Interfaces/FilterInterface";
import { HistoryController, UserController, WorkflowController } from ".";
import { ISearch } from "../utils/FilterQuery";
import { PermissionMiddleware } from "../middleware";
import {
  selPermissionAllow,
  selPermissionType,
} from "../middleware/PermissionMiddleware";
import { ObjectId } from "mongodb";
import UserModel from "../models/UserModel";

const Db = PermissionModel;
const redisName = "permission";

class PermissionController implements IController {
  index = async (req: Request | any, res: Response): Promise<Response> => {
    const stateFilter: IStateFilter[] = [
      {
        alias: "Id",
        name: "_id",
        operator: ["=", "!="],
        typeOf: TypeOfState.String,
      },
      {
        alias: "Allow",
        name: "allow",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
        isSort: true,
      },
      {
        alias: "Doc",
        name: "doc",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
        isSort: true,
      },
      {
        alias: "Alldoc",
        name: "allDoc",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
        isSort: true,
      },
      {
        alias: "Value",
        name: "value",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
        isSort: true,
      },
      {
        alias: "User",
        name: "user",
        operator: ["=", "!="],
        typeOf: TypeOfState.String,
      },

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
        alias: "UpdatedAt",
        name: "updatedAt",
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
    ];
    try {
      // Mengambil query
      const filters: any = req.query.filters
        ? JSON.parse(`${req.query.filters}`)
        : [];
      const fields: any = req.query.fields
        ? JSON.parse(`${req.query.fields}`)
        : [
            "user.name",
            "allow",
            "doc",
            "allDoc",
            "value",
            "workflowState",
            "createdBy.name",
            "status",
            "createdAt",
            "updatedAt",
          ];
      const order_by: any = req.query.order_by
        ? JSON.parse(`${req.query.order_by}`)
        : { updatedAt: -1 };
      const limit: number | string = parseInt(`${req.query.limit}`) || 10;
      let page: number | string = parseInt(`${req.query.page}`) || 1;
      let search: ISearch = {
        filter: ["doc", "workflowState"],
        value: req.query.search || "",
      };

      // Mengambil hasil fields
      let setField = FilterQuery.getField(fields);
      // End

      // Mengambil hasil filter
      let isFilter = FilterQuery.getFilter(filters, stateFilter, search, [
        "_id",
        "createdBy",
        "user",
      ]);
      // End

      // Mengecek permission user
      const userPermission = await PermissionMiddleware.getPermission(
        req.userId,
        selPermissionAllow.USER,
        selPermissionType.USER
      );
      // End

      // Validasi apakah filter valid

      if (!isFilter.status) {
        return res
          .status(400)
          .json({ status: 400, msg: "Error, Filter Invalid " });
      }

      // End

      let pipelineTotal: any = [
        {
          $match: isFilter.data,
        },
        {
          $lookup: {
            from: "users",
            localField: "createdBy",
            foreignField: "_id",
            as: "createdBy",
          },
        },
        {
          $unwind: "$createdBy",
        },
        {
          $lookup: {
            from: "users",
            localField: "user",
            foreignField: "_id",
            as: "user",
          },
        },
        {
          $unwind: "$createdBy",
        },
        {
          $project: setField,
        },

        {
          $count: "total_orders",
        },
      ];

      let pipelineResult: any = [
        {
          $match: isFilter.data,
        },
        {
          $lookup: {
            from: "users",
            localField: "createdBy",
            foreignField: "_id",
            as: "createdBy",
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "user",
            foreignField: "_id",
            as: "user",
          },
        },
        {
          $unwind: "$createdBy",
        },
        {
          $unwind: "$user",
        },

        {
          $project: setField,
        },
        {
          $sort: order_by,
        },
        {
          $skip: limit > 0 ? page * limit - limit : 0,
        },
      ];

      // Menambahkan limit ketika terdapat limit
      if (limit > 0) {
        pipelineResult.push({ $limit: limit });
      }
      // End

      // Cek Permission User

      if (userPermission.length > 0) {
        const user = await UserModel.find(
          { _id: { $in: userPermission } },
          { _id: 1 }
        );

        if (user.length === 0) {
          return res.status(400).json({
            status: 404,
            msg: "Data tidak ditemukan!",
          });
        }

        const validUser = user.map((item) => item._id);

        pipelineTotal.unshift({
          $match: {
            $or: [
              { user: { $in: validUser } },
              { user: new ObjectId(req.userId) },
            ],
          },
        });
        pipelineResult.unshift({
          $match: {
            $or: [
              { user: { $in: validUser } },
              { user: new ObjectId(req.userId) },
            ],
          },
        });
      }

      const totalData = await Db.aggregate(pipelineTotal);

      const getAll = totalData.length > 0 ? totalData[0].total_orders : 0;

      const result = await Db.aggregate(pipelineResult);
      if (result.length > 0) {
        const finalData = result.map(async (item: any): Promise<any[]> => {
          const allow = item.allow;

          let dbRelate: string = "";

          switch (allow) {
            case "user":
              dbRelate = "users";
              break;
            case "branch":
              dbRelate = "branches";
              break;
            case "usergroup":
              dbRelate = "usergroups";
              break;
            case "customer":
              dbRelate = "customers";
              break;
            case "customergroup":
              dbRelate = "customergroups";
              break;

            default:
              break;
          }

          let pipeline: any[] = [];

          if (dbRelate) {
            pipeline.push(
              // {
              //   $project: {
              //     _id: 1,
              //     value: 1,
              //   },
              // },
              {
                $match: { _id: item._id },
              },
              {
                $lookup: {
                  from: "users",
                  localField: "createdBy",
                  foreignField: "_id",
                  as: "createdBy",
                  pipeline: [
                    {
                      $project: {
                        _id: 1,
                        name: 1,
                      },
                    },
                  ],
                },
              },
              {
                $unwind: "$createdBy",
              },
              {
                $lookup: {
                  from: "users",
                  localField: "user",
                  foreignField: "_id",
                  as: "user",
                  pipeline: [
                    {
                      $project: {
                        _id: 1,
                        name: 1,
                      },
                    },
                  ],
                },
              },
              {
                $unwind: "$createdBy",
              },

              {
                $lookup: {
                  from: dbRelate,
                  localField: "value",
                  foreignField: "_id",
                  as: "value",
                  pipeline: [
                    {
                      $project: {
                        _id: 1,
                        name: 1,
                      },
                    },
                  ],
                },
              },
              {
                $unwind: "$value",
              }
              // {
              //   $project: {
              //     value: 1,
              //   },
              // }
            );
          }

          let getData = await Db.aggregate(pipeline);

          let data = item;
          if (getData.length > 0) {
            data = getData[0];
          }

          return { ...data };
        });

        return res.status(200).json({
          status: 200,
          total: getAll,
          limit,
          nextPage: getAll > page * limit && limit > 0 ? page + 1 : page,
          hasMore: getAll > page * limit && limit > 0 ? true : false,
          data: await Promise.all(finalData),
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
    if (!req.body.user) {
      return res.status(400).json({ status: 400, msg: "user Required!" });
    }
    if (!req.body.allow) {
      return res.status(400).json({ status: 400, msg: "allow Required!" });
    }
    if (!req.body.value) {
      return res.status(400).json({ status: 400, msg: "value Required!" });
    }

    if (req.body.allDoc) {
      req.body.doc = "";
    } else {
      if (!req.body.doc) {
        return res.status(400).json({ status: 400, msg: "doc Required!" });
      }
    }
    req.body.createdBy = req.userId;

    try {
      // Cek User terdaftar
      const isRegUser = await UserController.checkUserRegistered(req.body.user);

      if (!isRegUser) {
        return res
          .status(400)
          .json({ status: 400, msg: "User is not registered!!" });
      }
      // End

      // Cek apakah terdapat duplikasi data
      const cekDuplicate = await Db.findOne({
        $and: [
          { doc: req.body.doc },
          { allow: req.body.allow },
          { user: req.body.user },
          { value: req.body.value },
          { allDoc: req.body.allDoc ?? 0 },
        ],
      });

      if (cekDuplicate) {
        return res.status(400).json({ status: 400, msg: "Duplicate Data!" });
      }
      // End

      const result = new Db(req.body);
      const response: any = await result.save();

      // push history
      await HistoryController.pushHistory({
        document: {
          _id: response._id,
          name: response.name ?? "Other",
          type: redisName,
        },
        message: `Membuat ${redisName} baru`,
        user: req.userId,
      });

      // End

      // await Redis.client.set(
      //   `${redisName}-${response._id}`,
      //   JSON.stringify(response),
      //   {
      //     EX: 30,
      //   }
      // );

      return res.status(200).json({ status: 200, data: result });
    } catch (error) {
      return res.status(400).json({ status: 400, msg: error });
    }
  };

  show = async (req: Request | any, res: Response): Promise<any> => {
    try {
      // const cache = await Redis.client.get(`${redisName}-${req.params.id}`);

      // if (cache) {
      //   const isCache = JSON.parse(cache);
      //   const cekPermission = await cekValidPermission(
      //     req.userId,
      //     {
      //       user: isCache.user._id,
      //     },
      //     selPermissionType.USER
      //   );

      //   if (!cekPermission) {
      //     if (`${req.userId}` !== `${isCache.user._id}`) {
      //       return res.status(403).json({
      //         status: 403,
      //         msg: "Anda tidak mempunyai akses untuk dok ini!",
      //       });
      //     }
      //   }
      //   const getHistory = await History.find(
      //     {
      //       $and: [
      //         { "document._id": `${isCache._id}` },
      //         { "document.type": redisName },
      //       ],
      //     },

      //     ["_id", "message", "createdAt", "updatedAt"]
      //   )
      //     .populate("user", "name")
      //     .sort({ createdAt: -1 });
      //   const buttonActions = await WorkflowController.getButtonAction(
      //     redisName,
      //     req.userId,
      //     isCache.workflowState
      //   );
      //   return res.status(200).json({
      //     status: 200,
      //     data: JSON.parse(cache),
      //     history: getHistory,
      //     workflow: buttonActions,
      //   });
      // }
      // const result: any = await Db.findOne({
      //   _id: req.params.id,
      // })
      //   .populate("createdBy", "name")
      //   .populate("user", "name");

      const cekValid = await Db.findOne(
        { _id: new ObjectId(req.params.id) },
        { allow: 1, value: 1 }
      );

      if (!cekValid) {
        return res
          .status(404)
          .json({ status: 404, msg: "Error, Data tidak ditemukan!" });
      }

      let pipeline = [
        { $match: { _id: new ObjectId(req.params.id) } },
        {
          $lookup: {
            from: "users",
            localField: "createdBy",
            foreignField: "_id",
            as: "createdBy",
            pipeline: [
              {
                $project: {
                  _id: 1,
                  name: 1,
                },
              },
            ],
          },
        },
        {
          $unwind: "$createdBy",
        },
        {
          $lookup: {
            from: "users",
            localField: "user",
            foreignField: "_id",
            as: "user",
            pipeline: [
              {
                $project: {
                  _id: 1,
                  name: 1,
                },
              },
            ],
          },
        },
        {
          $unwind: "$createdBy",
        },
      ];

      const allow = cekValid.allow;

      let dbRelate: string = "";

      switch (allow) {
        case "user":
          dbRelate = "users";
          break;
        case "branch":
          dbRelate = "branches";
          break;
        case "usergroup":
          dbRelate = "usergroups";
          break;
        case "customer":
          dbRelate = "customers";
          break;
        case "customergroup":
          dbRelate = "customergroups";
          break;

        default:
          break;
      }

      if (dbRelate) {
        pipeline.push(
          {
            $lookup: {
              from: dbRelate,
              localField: "value",
              foreignField: "_id",
              as: "value",
              pipeline: [
                {
                  $project: {
                    _id: 1,
                    name: 1,
                  },
                },
              ],
            },
          },
          {
            $unwind: "$value",
          }
        );
      }

      const getData = await Db.aggregate(pipeline);

      if (getData.length === 0) {
        return res
          .status(404)
          .json({ status: 404, msg: "Error, Data tidak ditemukan!" });
      }

      const result = getData[0];

      const cekPermission = await cekValidPermission(
        req.userId,
        {
          user: result.user._id,
        },
        selPermissionType.USER
      );

      if (!cekPermission) {
        if (`${req.userId}` !== `${result.user._id}`) {
          return res.status(403).json({
            status: 403,
            msg: "Anda tidak mempunyai akses untuk dok ini!",
          });
        }
      }

      const buttonActions = await WorkflowController.getButtonAction(
        redisName,
        req.userId,
        result.workflowState
      );

      // return res.send(buttonActions)
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

      // await Redis.client.set(
      //   `${redisName}-${req.params.id}`,
      //   JSON.stringify(result),
      //   {
      //     EX: 30,
      //   }
      // );

      return res.status(200).json({
        status: 200,
        data: result,
        history: getHistory,
        workflow: buttonActions,
      });
    } catch (error) {
      return res.status(404).json({ status: 404, msg: error });
    }
  };

  update = async (req: Request | any, res: Response): Promise<any> => {
    try {
      const result: any = await Db.findOne({
        _id: req.params.id,
      })
        .populate("createdBy", "name")
        .populate("user", "name");

      if (result) {
        // Cek permission

        const cekPermission = await cekValidPermission(
          req.userId,
          {
            user: result.user._id,
          },
          selPermissionType.USER
        );

        if (!cekPermission) {
          if (`${req.userId}` !== `${result.user._id}`) {
            return res.status(403).json({
              status: 403,
              msg: "Anda tidak mempunyai akses untuk dok ini!",
            });
          }
        }

        // End

        // Cek User terdaftar
        if (req.body.user) {
          const isRegUser = await UserController.checkUserRegistered(
            req.body.user
          );

          if (!isRegUser) {
            return res
              .status(400)
              .json({ status: 400, msg: "User is not registered!!" });
          }
        }
        // End

        // Cek apakah terdapat duplikasi data
        const cekDuplicate = await Db.findOne({
          $and: [
            { doc: req.body.doc ? req.body.doc : result.doc },
            { allow: req.body.allow ? req.body.allow : result.allow },
            { user: req.body.user ? req.body.user : result.user._id },
            { value: req.body.value ? req.body.value : result.value },
            { allDoc: req.body.allDoc ? req.body.allDoc : result.allDoc },
            { _id: { $ne: req.params.id } },
          ],
        });

        if (cekDuplicate) {
          return res.status(400).json({ status: 400, msg: "Duplicate Data!" });
        }
        // End

        if (req.body.nextState) {
          const checkedWorkflow =
            await WorkflowController.permissionUpdateAction(
              redisName,
              req.userId,
              req.body.nextState,
              result.user._id
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
          .populate("createdBy", "name")
          .populate("user", "name");
        // await Redis.client.set(
        //   `${redisName}-${req.params.id}`,
        //   JSON.stringify(getData),
        //   {
        //     EX: 30,
        //   }
        // );

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
          .json({ status: 404, msg: "Error update, data not found" });
      }
    } catch (error: any) {
      return res.status(404).json({ status: 404, data: error });
    }
  };

  delete = async (req: Request | any, res: Response): Promise<Response> => {
    try {
      const cekValid = await Db.findById(req.params.id, { _id: 1, user: 1 });

      if (!cekValid) {
        return res
          .status(404)
          .json({ status: 404, msg: "Error, Data tidak ditemukan!" });
      }

      const cekPermission = await cekValidPermission(
        req.userId,
        {
          user: cekValid.user,
        },
        selPermissionType.USER
      );

      if (!cekPermission) {
        if (`${req.userId}` !== `${cekValid.user}`) {
          return res.status(403).json({
            status: 403,
            msg: "Anda tidak mempunyai akses untuk dok ini!",
          });
        }
      }

      const result = await Db.findByIdAndDelete(req.params.id);
      // await Redis.client.del(`${redisName}-${req.params.id}`);
      // push history
      // await HistoryController.pushHistory({
      //   document: {
      //     _id: cekValid._id,
      //     name: cekValid.name,
      //     type: redisName,
      //   },
      //   message: `Menghapus ${redisName} nomor ${cekValid.name}`,
      //   user: req.userId,
      // });
      // End
      return res.status(200).json({ status: 200, data: result });
    } catch (error) {
      return res.status(404).json({ status: 404, msg: error });
    }
  };
}

export default new PermissionController();

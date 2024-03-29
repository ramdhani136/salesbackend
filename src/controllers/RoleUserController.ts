import { Request, Response } from "express";
// import Redis from "../config/Redis";
import { IStateFilter } from "../Interfaces";
import { FilterQuery, cekValidPermission } from "../utils";
import IController from "./ControllerInterface";
import { TypeOfState } from "../Interfaces/FilterInterface";
import { History, RoleProfileModel, RoleUserModel, User } from "../models";
import { PermissionMiddleware } from "../middleware";
import {
  selPermissionAllow,
  selPermissionType,
} from "../middleware/PermissionMiddleware";
import { ObjectId } from 'bson';
import HistoryController from "./HistoryController";
import WorkflowController from "./WorkflowController";
import { ISearch } from "../utils/FilterQuery";

const Db = RoleUserModel;
const redisName = "roleuser";

class RoleUserController implements IController {
  index = async (req: Request | any, res: Response): Promise<Response> => {
    const stateFilter: IStateFilter[] = [
      {
        alias: "RoleProfile",
        name: "roleprofile",
        operator: ["=", "!="],
        typeOf: TypeOfState.String,
      },
      // {
      //   name: "roleprofile.name",
      //   operator: ["=", "!=", "like", "notlike"],
      //   typeOf: TypeOfState.String,
      // },
      {
        alias: "User",
        name: "user",
        operator: ["=", "!="],
        typeOf: TypeOfState.String,
      },
      // {
      //   name: "user.name",
      //   operator: ["=", "!=", "like", "notlike"],
      //   typeOf: TypeOfState.String,
      // },
      {
        alias: "CreatedBy",
        name: "createdBy",
        operator: ["=", "!="],
        typeOf: TypeOfState.String,
      },
      // {
      //   name: "createdBy.name",
      //   operator: ["=", "!=", "like", "notlike"],
      //   typeOf: TypeOfState.String,
      // },
      {
        alias: "UpdatedAt",
        name: "updatedAt",
        operator: ["=", "!=",  ">", "<", ">=", "<="],
        typeOf: TypeOfState.Date,
        isSort: true,
      },
      {
        alias: "CreatedAt",
        name: "createdAt",
        operator: ["=", "!=", ">", "<", ">=", "<="],
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
            "roleprofile.name",
            "roleprofile._id",
            "user.name",
            "user._id",
            "createdBy.name",
            "createdBy._id",
          ];
      const order_by: any = req.query.order_by
        ? JSON.parse(`${req.query.order_by}`)
        : { updatedAt: -1 };
      const limit: number | string = parseInt(`${req.query.limit}`) || 0;
      let page: number | string = parseInt(`${req.query.page}`) || 1;
      let setField = FilterQuery.getField(fields);
      // let search: ISearch = {
      //   filter: ["user.name"],
      //   value: req.query.search || "",
      // };
      let isFilter = FilterQuery.getFilter(filters, stateFilter, undefined, [
        "_id",
        "createdBy",
        "user",
        "roleprofile",
      ]);

      // Mengambil rincian permission user
      const userPermission = await PermissionMiddleware.getPermission(
        req.userId,
        selPermissionAllow.USER,
        selPermissionType.USER
      );
      // End

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
            from: "roleprofiles",
            localField: "roleprofile",
            foreignField: "_id",
            as: "roleprofile",
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
          $lookup: {
            from: "users",
            localField: "createdBy",
            foreignField: "_id",
            as: "createdBy",
          },
        },
        {
          $unwind: "$roleprofile",
        },
        {
          $unwind: "$user",
        },
        {
          $unwind: "$createdBy",
        },

        {
          $count: "total_orders",
        },
      ];

      // Menambahkan filter berdasarkan permission user
      if (userPermission.length > 0) {
        pipelineTotal.unshift({
          $match: {
            user: { $in: userPermission.map((id) => new ObjectId(id)) },
          },
        });
      }
      // End

      const totalData = await Db.aggregate(pipelineTotal);

      const getAll = totalData.length > 0 ? totalData[0].total_orders : 0;

      let pipelineResult: any = [
        {
          $match: isFilter.data,
        },
        {
          $sort: order_by,
        },
        {
          $lookup: {
            from: "roleprofiles",
            localField: "roleprofile",
            foreignField: "_id",
            as: "roleprofile",
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
          $lookup: {
            from: "users",
            localField: "createdBy",
            foreignField: "_id",
            as: "createdBy",
          },
        },
        {
          $unwind: "$roleprofile",
        },
        {
          $unwind: "$user",
        },
        {
          $unwind: "$createdBy",
        },

        {
          $project: setField,
        },
        {
          $skip: limit > 0 ? page * limit - limit : 0,
        },
      ];

      // Menambahkan limit ketika terdapat limit
      if (limit > 0) {
        pipelineResult.push({ $limit: limit > 0 ? limit : getAll });
      }
      // End

      // Menambahkan filter berdasarkan permission user
      if (userPermission.length > 0) {
        pipelineResult.unshift({
          $match: {
            user: { $in: userPermission.map((id) => new ObjectId(id)) },
          },
        });
      }
      // End

      const result = await Db.aggregate(pipelineResult);

      // if (result.length > 0) {
      return res.status(200).json({
        status: 200,
        total: getAll,
        limit,
        nextPage: getAll > page * limit && limit > 0 ? page + 1 : page,
        hasMore: getAll > page * limit && limit > 0 ? true : false,
        data: result,
        filters: stateFilter,
      });
      // }
      // return res.status(400).json({
      //   status: 404,
      //   msg: "Data Not found!",
      // });
    } catch (error: any) {
      return res.status(400).json({
        status: 400,
        msg: Object.keys(error).length > 0 ? error : "Error,Invalid Request",
      });
    }
  };

  create = async (req: Request | any, res: Response): Promise<Response> => {
    if (!req.body.roleprofile) {
      return res
        .status(400)
        .json({ status: 400, msg: "roleprofile Required!" });
    }
    if (!req.body.user) {
      return res.status(400).json({ status: 400, msg: "user Required!" });
    }

    try {
      // Cek roleprofile terdaftar
      const cekRoleValid: any = await RoleProfileModel.findOne({
        $and: [{ _id: req.body.roleprofile }],
      });

      if (!cekRoleValid) {
        return res.status(404).json({
          status: 404,
          msg: "Error, roleprofile tidak ditemukan!",
        });
      }

      if (cekRoleValid.status != 1) {
        return res.status(404).json({
          status: 404,
          msg: "Error, roleprofile tidak aktif!",
        });
      }

      // Cek user terdaftar
      const cekUser = await User.findOne({
        $and: [{ _id: req.body.user }],
      });
      if (!cekUser) {
        return res
          .status(404)
          .json({ status: 404, msg: "Error, User tidak ditemukan!" });
      }
      // End

      // Cek duplikasi data
      const dupl = await Db.findOne({
        $and: [{ user: req.body.user }, { roleprofile: req.body.roleprofile }],
      });

      if (dupl) {
        return res
          .status(404)
          .json({ status: 404, msg: "Error, duplicate data" });
      }
      // End

      req.body.createdBy = req.userId;
      const result = new Db(req.body);
      const response: any = await result.save();

      const data: any = await response.populate({
        path: "user",
        select: "name",
      });

      // push history
      await HistoryController.pushHistory({
        document: {
          _id: data._id,
          name: data.user.name,
          type: redisName,
        },
        message: `Menambahkan roleuser ${data.user.name} `,
        user: req.userId,
      });
      // End

      return res.status(200).json({ status: 200, data: data });
    } catch (error) {
      return res
        .status(400)
        .json({ status: 400, msg: error ?? "Error Connection!" });
    }
  };

  show = async (req: Request | any, res: Response): Promise<Response> => {
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
      //     return res.status(403).json({
      //       status: 403,
      //       msg: "Anda tidak mempunyai akses untuk dok ini!",
      //     });
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
      const result: any = await Db.findOne({ _id: req.params.id })
        .populate("roleprofile", "name")
        .populate("user", "name")
        .populate("createdBy", "name");

      if (!result) {
        return res
          .status(404)
          .json({ status: 404, msg: "Error, Data tidak ditemukan!" });
      }

      const cekPermission = await cekValidPermission(
        req.userId,
        {
          user: result.user._id,
        },
        selPermissionType.USER
      );

      if (!cekPermission) {
        return res.status(403).json({
          status: 403,
          msg: "Anda tidak mempunyai akses untuk dok ini!",
        });
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
      //   JSON.stringify(result)
      // );

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
    try {
      const result: any = await Db.findOne({
        _id: req.params.id,
      })
        .populate("roleprofile", "name")
        .populate("user", "name")
        .populate("createdBy", "name");

      if (result) {
        // Cek permission user
        const cekPermission = await cekValidPermission(
          req.userId,
          {
            user: result.user._id,
          },
          selPermissionType.USER
        );

        if (!cekPermission) {
          return res.status(403).json({
            status: 403,
            msg: "Anda tidak mempunyai akses untuk dok ini!",
          });
        }

        // Emd

        //Cek roleprofile aktif
        if (req.body.roleprofile) {
          const cekRoleValid: any = await RoleProfileModel.findOne({
            $and: [{ _id: req.body.roleprofile }],
          });

          if (!cekRoleValid) {
            return res.status(404).json({
              status: 404,
              msg: "Error, roleprofile tidak ditemukan!",
            });
          }

          if (cekRoleValid.status != 1) {
            return res.status(404).json({
              status: 404,
              msg: "Error, roleprofile tidak aktif!",
            });
          }
        }
        // End

        // Cek duplikasi data
        if (req.body.roleprofile || req.body.user) {
          const dupl = await Db.findOne({
            $and: [
              { user: req.body.user ? req.body.user : result.user._id },
              {
                roleprofile: req.body.roleprofile
                  ? req.body.roleprofile
                  : result.roleprofile._id,
              },
              {
                _id: { $ne: req.params.id },
              },
            ],
          });

          if (dupl) {
            return res
              .status(404)
              .json({ status: 404, msg: "Error, duplicate data" });
          }
        }
        // End

        if (req.body.nextState) {
          const checkedWorkflow =
            await WorkflowController.permissionUpdateAction(
              redisName,
              req.userId,
              req.body.nextState,
              result.createdBy._id
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
          .populate("roleprofile", "name")
          .populate("user", "name")
          .populate("createdBy", "name");

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
      return res.status(404).json({ status: 404, msg: error });
    }
  };

  delete = async (req: Request | any, res: Response): Promise<Response> => {
    try {
      const getData: any = await Db.findOne({ _id: req.params.id });

      if (!getData) {
        return res
          .status(404)
          .json({ status: 404, msg: "Error, Data tidak ditemukan!" });
      }

      const cekPermission = await cekValidPermission(
        req.userId,
        {
          user: getData.user,
        },
        selPermissionType.USER
      );

      if (!cekPermission) {
        return res.status(403).json({
          status: 403,
          msg: "Anda tidak mempunyai akses untuk dok ini!",
        });
      }

      const result = await Db.deleteOne({ _id: req.params.id });
      // await Redis.client.del(`${redisName}-${req.params.id}`);
      return res.status(200).json({ status: 200, data: result });
    } catch (error) {
      return res.status(404).json({ status: 404, msg: error });
    }
  };
}

export default new RoleUserController();

import { Request, Response } from "express";
import Redis from "../config/Redis";
import { IStateFilter } from "../Interfaces";
import { FilterQuery } from "../utils";
import IController from "./ControllerInterface";
import { TypeOfState } from "../Interfaces/FilterInterface";
import { UserGroupListModel as Db, History, UserGroupModel } from "../models";
import { PermissionMiddleware } from "../middleware";
import {
  selPermissionAllow,
  selPermissionType,
} from "../middleware/PermissionMiddleware";
import { ObjectId } from "mongodb";
import HistoryController from "./HistoryController";
import WorkflowController from "./WorkflowController";
import { ISearch } from "../utils/FilterQuery";
import UserModel from "../models/UserModel";

const redisName = "usergrouplist";

class UserGroupListController implements IController {
  index = async (req: Request | any, res: Response): Promise<Response> => {
    const stateFilter: IStateFilter[] = [
      {
        name: "_id",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
      },

      {
        name: "name",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
      },
      {
        name: "status",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
      },
      {
        name: "workflowState",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
      },
      {
        name: "createdAt",
        operator: ["=", "!=", "like", "notlike", ">", "<", ">=", "<="],
        typeOf: TypeOfState.Date,
      },
      {
        name: "updatedAt",
        operator: ["=", "!=", "like", "notlike", ">", "<", ">=", "<="],
        typeOf: TypeOfState.Date,
      },
    ];
    try {
      const filters: any = req.query.filters
        ? JSON.parse(`${req.query.filters}`)
        : [];
      const fields: any = req.query.fields
        ? JSON.parse(`${req.query.fields}`)
        : ["user", "createdBy", "updatedAt", "userGroup"];
      const order_by: any = req.query.order_by
        ? JSON.parse(`${req.query.order_by}`)
        : { updatedAt: -1 };
      const limit: number | string = parseInt(`${req.query.limit}`) || 0;
      let page: number | string = parseInt(`${req.query.page}`) || 1;
      let setField = FilterQuery.getField(fields);

      let isFilter = FilterQuery.getFilter(filters, stateFilter);

      // Mengambil rincian permission user
      // const userPermission = await PermissionMiddleware.getPermission(
      //   req.userId,
      //   selPermissionAllow.USER,
      //   selPermissionType.CUSTOMER
      // );
      // End

      if (!isFilter.status) {
        return res
          .status(400)
          .json({ status: 400, msg: "Error, Filter Invalid " });
      }
      // End

      const getAll = await Db.find(isFilter.data, setField).count();

      const result = await Db.find(isFilter.data, setField)
        .sort(order_by)
        .limit(limit)
        .skip(limit > 0 ? page * limit - limit : 0);

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
        msg: "Data Not found!",
      });
    } catch (error: any) {
      return res.status(400).json({
        status: 400,
        msg: Object.keys(error).length > 0 ? error : "Error,Invalid Request",
      });
    }
  };

  create = async (req: Request | any, res: Response): Promise<Response> => {
    try {
      // Cek User Group
      if (!req.body.userGroup) {
        return res
          .status(400)
          .json({ status: 400, msg: "Error, userGroup id wajib diisi!" });
      }

      if (typeof req.body.userGroup !== "string") {
        return res.status(404).json({
          status: 404,
          msg: "Error, Cek kembali data userGroup, Data harus berupa string id userGroup!",
        });
      }

      const cekUG = await UserGroupModel.findOne({
        $and: [{ _id: new ObjectId(req.body.userGroup) }],
      });

      if (!cekUG) {
        return res.status(404).json({
          status: 404,
          msg: "Error, userGroup tidak ditemukan!",
        });
      }

      if (cekUG.status !== "1") {
        return res.status(404).json({
          status: 404,
          msg: "Error, userGroup tidak aktif!",
        });
      }

      req.body.userGroup = {
        _id: cekUG._id,
        name: cekUG.name,
      };
      // End

      // Cek User
      if (!req.body.user) {
        return res
          .status(400)
          .json({ status: 400, msg: "Error, user wajib diisi!" });
      }

      if (typeof req.body.user !== "string") {
        return res.status(404).json({
          status: 404,
          msg: "Error, Cek kembali data user, Data harus berupa string id user!",
        });
      }

      const cekUser = await UserModel.findOne({
        $and: [{ _id: new ObjectId(req.body.user) }],
      });

      if (!cekUser) {
        return res.status(404).json({
          status: 404,
          msg: "Error, user tidak ditemukan!",
        });
      }

      if (cekUser.status !== "1") {
        return res.status(404).json({
          status: 404,
          msg: "Error, user tidak aktif!",
        });
      }

      req.body.user = {
        _id: cekUser._id,
        name: cekUser.name,
      };
      // End

      // Cek duplicate
      const dup = await Db.findOne({
        $and: [{ "userGroup._id": cekUG._id }, { "user._id": cekUser._id }],
      });

      if (dup) {
        return res.status(400).json({
          status: 400,
          msg: `Error , data sudah ada di database!`,
        });
      }
      // End

      req.body.createdBy = {
        _id: new ObjectId(req.userId),
        name: req.user,
      };

      const result = new Db(req.body);
      const response: any = await result.save();

      // push history
      await HistoryController.pushHistory({
        document: {
          _id: response._id,
          name: response.userGroup.name,
          type: redisName,
        },
        message: `${req.user} menambahkan user ${response.user.name} ke group ${response.userGroup.name} `,
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
      });

      if (!result) {
        return res
          .status(404)
          .json({ status: 404, msg: "Error, Data tidak ditemukan!" });
      }


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
    // End

    // Cek User Group
    if (req.body.userGroup) {
      if (typeof req.body.userGroup !== "string") {
        return res.status(404).json({
          status: 404,
          msg: "Error, Cek kembali data userGroup, Data harus berupa string id userGroup!",
        });
      }

      const cekUG = await UserGroupModel.findOne({
        $and: [{ _id: new ObjectId(req.body.userGroup) }],
      });

      if (!cekUG) {
        return res.status(404).json({
          status: 404,
          msg: "Error, userGroup tidak ditemukan!",
        });
      }

      if (cekUG.status !== "1") {
        return res.status(404).json({
          status: 404,
          msg: "Error, userGroup tidak aktif!",
        });
      }

      req.body.userGroup = {
        _id: cekUG._id,
        name: cekUG.name,
      };
    }

    // End

    // Cek User
    if (req.body.user) {
      if (typeof req.body.user !== "string") {
        return res.status(404).json({
          status: 404,
          msg: "Error, Cek kembali data user, Data harus berupa string id user!",
        });
      }

      const cekUser = await UserModel.findOne({
        $and: [{ _id: new ObjectId(req.body.user) }],
      });

      if (!cekUser) {
        return res.status(404).json({
          status: 404,
          msg: "Error, user tidak ditemukan!",
        });
      }

      if (cekUser.status !== "1") {
        return res.status(404).json({
          status: 404,
          msg: "Error, user tidak aktif!",
        });
      }

      req.body.user = {
        _id: cekUser._id,
        name: cekUser.name,
      };
    }
    // End

    try {
      const result: any = await Db.findOne({
        _id: req.params.id,
      });

      // Cek duplicate
      const dup = await Db.findOne({
        $and: [
          {
            "userGroup._id": req.body.userGroup
              ? new ObjectId(req.body.userGroup._id)
              : result.userGroup._id,
          },
          {
            "user._id": req.body.user
              ? new ObjectId(req.body.user._id)
              : result.user._id,
          },
        ],
      });

      if (dup) {
        return res.status(400).json({
          status: 400,
          msg: `Error , data sudah ada di database!`,
        });
      }
      // End

      if (result) {
        if (req.body.id_workflow && req.body.id_state) {
          const checkedWorkflow =
            await WorkflowController.permissionUpdateAction(
              req.body.id_workflow,
              req.userId,
              req.body.id_state,
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
        });

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
          .json({ status: 404, msg: "Error update, data not found" });
      }
    } catch (error: any) {
      return res.status(404).json({ status: 404, data: error });
    }
  };

  delete = async (req: Request, res: Response): Promise<Response> => {
    try {
      const getData: any = await Db.findOne({ _id: req.params.id });

      if (!getData) {
        return res.status(404).json({ status: 404, msg: "Not found!" });
      }

      const result = await Db.deleteOne({ _id: req.params.id });
      await Redis.client.del(`${redisName}-${req.params.id}`);
      return res.status(200).json({ status: 200, data: result });
    } catch (error) {
      return res.status(404).json({ status: 404, msg: error });
    }
  };
}

export default new UserGroupListController();
import { Request, Response } from "express";
import Redis from "../config/Redis";
import { IStateFilter } from "../Interfaces";
import { FilterQuery } from "../utils";
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

const Db = PermissionModel;
const redisName = "permission";

class PermissionController implements IController {
  index = async (req: Request | any, res: Response): Promise<Response> => {
    const stateFilter: IStateFilter[] = [
      {
        name: "_id",
        operator: ["=", "!="],
        typeOf: TypeOfState.String,
      },
      {
        name: "allow",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
      },
      {
        name: "doc",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
      },
      {
        name: "allDoc",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
      },
      {
        name: "value",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
      },
      {
        name: "user._id",
        operator: ["=", "!="],
        typeOf: TypeOfState.String,
      },
      {
        name: "user.name",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
      },
      {
        name: "createdBy._id",
        operator: ["=", "!="],
        typeOf: TypeOfState.String,
      },
      {
        name: "createdBy.name",
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
        name: "updatedAt",
        operator: ["=", "!=", "like", "notlike", ">", "<", ">=", "<="],
        typeOf: TypeOfState.Date,
      },
      {
        name: "createdAt",
        operator: ["=", "!=", "like", "notlike", ">", "<", ">=", "<="],
        typeOf: TypeOfState.Date,
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
      const limit: number | string = parseInt(`${req.query.limit}`) || 0;
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
        "createdBy._id",
        "user._id",
      ]);
      // End

      // Mengecek permission user
      const userPermission = await PermissionMiddleware.getPermission(
        req.userId,
        selPermissionAllow.USER,
        selPermissionType.PERMISSION
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
          $match: isFilter.data,
        },

        {
          $count: "total_orders",
        },
      ];

      // Menambahkan filter berdasarkan permission user
      if (userPermission.length > 0) {
        pipelineTotal.unshift({
          $match: {
            createdBy: { $in: userPermission.map((id) => new ObjectId(id)) },
          },
        });
      }
      // End

      const totalData = await Db.aggregate(pipelineTotal);

      const getAll = totalData.length > 0 ? totalData[0].total_orders : 0;

      let pipelineResult: any = [
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
          $match: isFilter.data,
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

      // Menambahkan filter berdasarkan permission user
      if (userPermission.length > 0) {
        pipelineResult.unshift({
          $match: {
            createdBy: { $in: userPermission.map((id) => new ObjectId(id)) },
          },
        });
      }
      // End

      const result = await Db.aggregate(pipelineResult);
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

      await Redis.client.set(
        `${redisName}-${response._id}`,
        JSON.stringify(response),
        {
          EX: 30,
        }
      );

      return res.status(200).json({ status: 200, data: result });
    } catch (error) {
      return res.status(400).json({ status: 400, msg: error });
    }
  };

  show = async (req: Request | any, res: Response): Promise<any> => {
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
      }).populate("createdBy", "name");

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

      await Redis.client.set(
        `${redisName}-${req.params.id}`,
        JSON.stringify(result),
        {
          EX: 30,
        }
      );

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

  delete = async (req: Request | any, res: Response): Promise<Response> => {
    try {
      const result: any = await Db.findOneAndDelete({ _id: req.params.id });
      if (result) {
        await Redis.client.del(`${redisName}-${req.params.id}`);
        // push history
        await HistoryController.pushHistory({
          document: {
            _id: result._id,
            name: result.name,
            type: redisName,
          },
          message: `Menghapus ${redisName} nomor ${result.name}`,
          user: req.userId,
        });
        // End
        return res.status(200).json({ status: 200, data: result });
      }
      return res.status(404).json({ status: 404, msg: "Error Delete!" });
    } catch (error) {
      return res.status(404).json({ status: 404, msg: error });
    }
  };
}

export default new PermissionController();

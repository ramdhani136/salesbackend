import { Request, Response } from "express";
import Redis from "../config/Redis";
import { IStateFilter } from "../Interfaces";
import { FilterQuery, cekValidPermission } from "../utils";
import IController from "./ControllerInterface";
import { TypeOfState } from "../Interfaces/FilterInterface";
import { UserGroupModel as Db, History, PermissionModel, UserGroupListModel } from "../models";
import { PermissionMiddleware } from "../middleware";
import {
  selPermissionAllow,
  selPermissionType,
} from "../middleware/PermissionMiddleware";
import { ObjectId } from "mongodb";
import HistoryController from "./HistoryController";
import WorkflowController from "./WorkflowController";
import { ISearch } from "../utils/FilterQuery";

const redisName = "usergroup";

class UserGroupController implements IController {
  index = async (req: Request | any, res: Response): Promise<Response> => {
    const stateFilter: IStateFilter[] = [
      {
        alias: "Id",
        name: "_id",
        operator: ["=", "!="],
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
        : ["name", "createdBy", "updatedAt", "status", "workflowState"];
      const order_by: any = req.query.order_by
        ? JSON.parse(`${req.query.order_by}`)
        : { updatedAt: -1 };
      const limit: number | string = parseInt(`${req.query.limit}`) || 0;
      let page: number | string = parseInt(`${req.query.page}`) || 1;
      let setField = FilterQuery.getField(fields);

      let search: ISearch = {
        filter: ["name"],
        value: req.query.search || "",
      };
      let isFilter = FilterQuery.getFilter(filters, stateFilter, search, [
        "createdBy",
        "_id",
      ]);

      // Mengambil rincian permission user
      const userPermission = await PermissionMiddleware.getPermission(
        req.userId,
        selPermissionAllow.USER,
        selPermissionType.USERGROUP
      );
      // End

      if (!isFilter.status) {
        return res
          .status(400)
          .json({ status: 400, msg: "Error, Filter Invalid " });
      }
      // End

      let FinalFIlter: any[] = [isFilter.data];

      if (userPermission.length > 0) {
        FinalFIlter.push({
          $or: [
            {
              createdBy: { $in: userPermission.map((id) => new ObjectId(id)) },
            },
            {
              createdBy: new ObjectId(req.userId),
            },
          ],
        });
      }

      const getAll = await Db.find({ $and: FinalFIlter }, setField).count();

      const result = await Db.find({ $and: FinalFIlter }, setField)
        .sort(order_by)
        .limit(limit)
        .skip(limit > 0 ? page * limit - limit : 0)
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
    if (!req.body.name) {
      return res
        .status(400)
        .json({ status: 400, msg: "Error, name wajib diisi!" });
    }

    try {
      // Cek duplicate
      const dup = await Db.findOne({ name: req.body.name });
      if (dup) {
        return res.status(400).json({
          status: 400,
          msg: `Error , name ${req.body.name} sudah ada di database!`,
        });
      }
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
        message: `${req.user} menambahkan userGroup ${response.name} `,
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
          selPermissionType.USERGROUP
        );

        if (!cekPermission) {
          if (`${req.userId}` !== `${isCache.createdBy._id}`) {
            return res.status(403).json({
              status: 403,
              msg: "Anda tidak mempunyai akses untuk dok ini!",
            });
          }
        }
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

      const cekPermission = await cekValidPermission(
        req.userId,
        {
          user: result.createdBy._id,
        },
        selPermissionType.USERGROUP
      );

      if (!cekPermission) {
        if (`${req.userId}` !== `${result.createdBy._id}`) {
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

    // Jika nama dirubah
    if (req.body.name) {
      const dupl = await Db.findOne({
        $and: [
          { name: req.body.name },
          {
            _id: { $ne: req.params.id },
          },
        ],
      });
      if (dupl) {
        return res.status(404).json({
          status: 404,
          msg: `Error, name ${req.body.name} sudah terinput di database!`,
        });
      }
    }

    // End

    try {
      const result: any = await Db.findOne({
        _id: req.params.id,
      }).populate("createdBy", "name");

      if (result) {
        const cekPermission = await cekValidPermission(
          req.userId,
          {
            user: result.createdBy._id,
          },
          selPermissionType.USERGROUP
        );

        if (!cekPermission) {
          if (`${req.userId}` !== `${result.createdBy._id}`) {
            return res.status(403).json({
              status: 403,
              msg: "Anda tidak mempunyai akses untuk dok ini!",
            });
          }
        }

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
        }).populate("createdBy", "name");

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
      const getData: any = await Db.findOne({ _id: req.params.id });

      if (!getData) {
        return res
          .status(404)
          .json({ status: 404, msg: "Error, Data tida ditemukan!" });
      }

      const cekPermission = await cekValidPermission(
        req.userId,
        {
          user: getData.createdBy,
        },
        selPermissionType.USERGROUP
      );

      if (!cekPermission) {
        if (`${req.userId}` !== `${getData.createdBy}`) {
          return res.status(403).json({
            status: 403,
            msg: "Anda tidak mempunyai akses untuk dok ini!",
          });
        }
      }

         // Cek apakah digunakan di permission data
         const permission = await PermissionModel.findOne(
          {
            $and: [
              { allow: "usergroup" },
              {
                value: new ObjectId(req.params.id),
              },
            ],
          },
          { _id: 1 }
        );
  
        if (permission) {
          return res.status(404).json({
            status: 404,
            msg: "UserGroup Group ini sudah digunakan oleh data permission!",
          });
        }
        // End

      const result = await Db.deleteOne({ _id: req.params.id });

      // Delete Child
      await this.DeletedRelateChild(new ObjectId(req.params.id));
      // End
      await Redis.client.del(`${redisName}-${req.params.id}`);
      return res.status(200).json({ status: 200, data: result });
    } catch (error) {
      return res.status(404).json({ status: 404, msg: error });
    }
  };

  protected DeletedRelateChild = async (id: ObjectId): Promise<any> => {
    try {
      await UserGroupListModel.deleteMany({
        userGroup: id,
      });
    } catch (error) {
      throw error;
    }
  };
}

export default new UserGroupController();

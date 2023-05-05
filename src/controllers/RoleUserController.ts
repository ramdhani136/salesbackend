import { Request, Response } from "express";
import Redis from "../config/Redis";
import { IStateFilter } from "../Interfaces";
import { FilterQuery } from "../utils";
import IController from "./ControllerInterface";
import { TypeOfState } from "../Interfaces/FilterInterface";
import { RoleProfileModel, RoleUserModel, User } from "../models";
import { PermissionMiddleware } from "../middleware";
import {
  selPermissionAllow,
  selPermissionType,
} from "../middleware/PermissionMiddleware";
import { ObjectId } from "mongodb";

const Db = RoleUserModel;
const redisName = "roleuser";

class RoleUserController implements IController {
  index = async (req: Request|any, res: Response): Promise<Response> => {
    const stateFilter: IStateFilter[] = [
      {
        name: "_id",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
      },
      {
        name: "roleprofile.name",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
      },
      {
        name: "user.name",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
      },
      {
        name: "createdBy.name",
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
      const filters: any = req.query.filters
        ? JSON.parse(`${req.query.filters}`)
        : [];
      const fields: any = req.query.fields
        ? JSON.parse(`${req.query.fields}`)
        : ["roleprofile.name", "user.name", "createdBy.name"];
      const order_by: any = req.query.order_by
        ? JSON.parse(`${req.query.order_by}`)
        : { updatedAt: -1 };
      const limit: number | string = parseInt(`${req.query.limit}`) || 10;
      let page: number | string = parseInt(`${req.query.page}`) || 1;
      let setField = FilterQuery.getField(fields);
      let isFilter = FilterQuery.getFilter(filters, stateFilter);

      // Mengambil rincian permission user
      const userPermission = await PermissionMiddleware.getPermission(
        req.userId,
        selPermissionAllow.USER,
        selPermissionType.BRANCH
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
          $match: isFilter.data,
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

      const getAll = await Db.aggregate(pipelineTotal);

      let pipelineResult: any = [
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
          $match: isFilter.data,
        },

        {
          $project: setField,
        },
        {
          $skip: limit > 0 ? page * limit - limit : 0,
        },
        {
          $limit: limit > 0 ? limit : getAll,
        },
      ];

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
          total: getAll.length,
          limit,
          nextPage: page + 1,
          hasMore: getAll.length > page * limit ? true : false,
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
    if (!req.body.roleprofile) {
      return res
        .status(400)
        .json({ status: 400, msg: "roleprofile Required!" });
    }
    if (!req.body.user) {
      return res.status(400).json({ status: 400, msg: "user Required!" });
    }

    try {
      const cekRoleValid = await RoleProfileModel.findById(
        req.body.roleprofile
      );
      // Cek user terdaftar
      const cekUser = await User.findById(req.body.user);
      if (!cekRoleValid) {
        return res
          .status(404)
          .json({ status: 404, msg: "Error, roleprofile not found!" });
      }
      if (!cekUser) {
        return res
          .status(404)
          .json({ status: 404, msg: "Error, user not found!" });
      }
      // End

      // Cek duplikasi data
      const dupl = await Db.findOne({
        $and: [{ user: req.body.user }, { roleprofile: req.body.roleprofile }],
      });
      // End

      console.log(dupl);
      if (dupl) {
        return res
          .status(404)
          .json({ status: 404, msg: "Error, duplicate data" });
      }

      req.body.createdBy = req.userId;
      const result = new Db(req.body);
      const response = await result.save();
      return res.status(200).json({ status: 200, data: response });
    } catch (error) {
      return res
        .status(400)
        .json({ status: 400, msg: error ?? "Error Connection!" });
    }
  };

  show = async (req: Request, res: Response): Promise<Response> => {
    try {
      const cache = await Redis.client.get(`${redisName}-${req.params.id}`);
      if (cache) {
        console.log("Cache");
        return res.status(200).json({ status: 200, data: JSON.parse(cache) });
      }
      const result = await Db.findOne({ _id: req.params.id })
        .populate("roleprofile", "name")
        .populate("user", "name")
        .populate("createdBy", "name");
      await Redis.client.set(
        `${redisName}-${req.params.id}`,
        JSON.stringify(result)
      );
      return res.status(200).json({ status: 200, data: result });
    } catch (error) {
      return res.status(404).json({ status: 404, data: error });
    }
  };

  update = async (req: Request, res: Response): Promise<Response> => {
    try {
      const result = await Db.updateOne({ name: req.params.id }, req.body);
      const getData = await Db.findOne({ name: req.params.id });
      await Redis.client.set(
        `${redisName}-${req.params.id}`,
        JSON.stringify(getData)
      );
      return res.status(200).json({ status: 200, data: result });
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

export default new RoleUserController();

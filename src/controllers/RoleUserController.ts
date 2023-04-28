import { Request, Response } from "express";
import Redis from "../config/Redis";
import { IStateFilter } from "../Interfaces";
import { FilterQuery } from "../utils";
import IController from "./ControllerInterface";
import { TypeOfState } from "../Interfaces/FilterInterface";
import { RoleProfile, RoleUser, User } from "../models";

const Db = RoleUser;
const redisName = "roleuser";

class RoleUserController implements IController {
  index = async (req: Request, res: Response): Promise<Response> => {
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

      if (!isFilter.status) {
        return res
          .status(400)
          .json({ status: 400, msg: "Error, Filter Invalid " });
      }
      // End
      const getAll = await Db.aggregate([
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
      ]);
      const result = await Db.aggregate([
        {
          $skip: page * limit - limit,
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
          $limit: limit,
        },
        {
          $project: setField,
        },
        {
          $sort: order_by,
        },
      ]);

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
      const cekRoleValid = await RoleProfile.findById(req.body.roleprofile);
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
      req.body.createdBy = req.userId;
      req.body.uniqId = `${req.body.user}${req.body.user}`;
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

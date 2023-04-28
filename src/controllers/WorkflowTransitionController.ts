import { Request, Response } from "express";
import Redis from "../config/Redis";
import { IStateFilter } from "../Interfaces";
import { FilterQuery } from "../utils";
import IController from "./ControllerInterface";
import { TypeOfState } from "../Interfaces/FilterInterface";
import {
  RoleProfile,
  Workflow,
  WorkflowAction,
  WorkflowState,
  WorkflowTransition,
} from "../models";

const Db = WorkflowTransition;
const redisName = "workflowtransition";

class WorkflowTransitionController implements IController {
  index = async (req: Request, res: Response): Promise<Response> => {
    const stateFilter: IStateFilter[] = [
      {
        name: "_id",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
      },
      {
        name: "user.name",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
      },
      {
        name: "workflow.name",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
      },
      {
        name: "action.name",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
      },
      {
        name: "stateActive.name",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
      },
      {
        name: "nextState.name",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
      },
      {
        name: "roleprofile.name",
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
        : [
            "name",
            "user._id",
            "user.name",
            "action._id",
            "action.name",
            "workflow._id",
            "workflow.name",
            "stateActive._id",
            "stateActive.name",
            "nextState.name",
            "nextState._id",
            "roleprofile._id",
            "roleprofile.name",
          ];
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
      const getAll = await Db.find(isFilter.data).count();
      const result = await Db.aggregate([
        {
          $skip: page * limit - limit,
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
            from: "workflowactions",
            localField: "action",
            foreignField: "_id",
            as: "action",
          },
        },
        {
          $lookup: {
            from: "workflows",
            localField: "workflow",
            foreignField: "_id",
            as: "workflow",
          },
        },
        {
          $lookup: {
            from: "workflowstates",
            localField: "stateActive",
            foreignField: "_id",
            as: "stateActive",
          },
        },
        {
          $lookup: {
            from: "workflowstates",
            localField: "nextState",
            foreignField: "_id",
            as: "nextState",
          },
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
          $unwind: "$stateActive",
        },
        {
          $unwind: "$roleprofile",
        },
        {
          $unwind: "$nextState",
        },
        {
          $unwind: "$user",
        },
        {
          $unwind: "$action",
        },
        {
          $unwind: "$workflow",
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
          total: getAll,
          limit,
          nextPage: page + 1,
          hasMore: getAll > page * limit ? true : false,
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

  create = async (req: Request | any, res: Response): Promise<any> => {
    if (!req.body.workflow) {
      return res.status(400).json({ status: 400, msg: "workflow Required!" });
    }
    if (!req.body.stateActive) {
      return res
        .status(400)
        .json({ status: 400, msg: "stateActive Required!" });
    }
    if (!req.body.action) {
      return res.status(400).json({ status: 400, msg: "action Required!" });
    }
    if (!req.body.nextState) {
      return res.status(400).json({ status: 400, msg: "nextState Required!" });
    }
    if (!req.body.roleprofile) {
      return res
        .status(400)
        .json({ status: 400, msg: "roleprofile Required!" });
    }
    req.body.user = req.userId;

    try {
      await Workflow.findById(`${req.body.workflow}`);
      await WorkflowAction.findById(`${req.body.action}`);
      await WorkflowState.findById(`${req.body.stateActive}`);
      await WorkflowState.findById(`${req.body.nextState}`);
      await RoleProfile.findById(`${req.body.roleprofile}`);
      const result = new Db(req.body);
      const response = await result.save();
      return res.status(200).json({ status: 200, data: response });
    } catch (error: any) {
      return res
        .status(400)
        .json({ status: 400, msg: error ?? "Error upload data!" });
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
        .populate("user", "name")
        .populate("workflow", "name")
        .populate("stateActive", "name")
        .populate("action", "name")
        .populate("nextState", "name")
        .populate("roleprofile", "name");
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

export default new WorkflowTransitionController();

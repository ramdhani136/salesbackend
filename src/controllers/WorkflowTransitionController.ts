import { Request, Response } from "express";
// import Redis from "../config/Redis";
import { IStateFilter } from "../Interfaces";
import { FilterQuery } from "../utils";
import IController from "./ControllerInterface";
import { TypeOfState } from "../Interfaces/FilterInterface";
import {
  RoleProfileModel,
  Workflow,
  WorkflowAction,
  WorkflowState,
  WorkflowTransition,
} from "../models";
import { ISearch } from "../utils/FilterQuery";

const Db = WorkflowTransition;
const redisName = "workflowtransition";

class WorkflowTransitionController implements IController {
  index = async (req: Request, res: Response): Promise<Response> => {
    const stateFilter: IStateFilter[] = [
      {
        alias:"Id",
        name: "_id",
        operator: ["=", "!="],
        typeOf: TypeOfState.String,
      },

      {
        alias:"User",
        name: "user",
        operator: ["=", "!="],
        typeOf: TypeOfState.String,
      },
      {
        alias:"Workflow",
        name: "workflow",
        operator: ["=", "!="],
        typeOf: TypeOfState.String,
      },
      {
        alias:"Action",
        name: "action",
        operator: ["=", "!="],
        typeOf: TypeOfState.String,
      },
      {
        alias:"StateActive",
        name: "stateActive",
        operator: ["=", "!="],
        typeOf: TypeOfState.String,
      },
      {
        alias:"NextState",
        name: "nextState",
        operator: ["=", "!="],
        typeOf: TypeOfState.String,
      },
      {
      alias:"RoleProfile",
        name: "roleprofile",
        operator: ["=", "!="],
        typeOf: TypeOfState.String,
      },
      {
        alias:"UpdatedAt",
        name: "updatedAt",
        operator: ["=", "!=", "like", "notlike", ">", "<", ">=", "<="],
        typeOf: TypeOfState.Date,
        isSort: true,
      },
      {
        alias:"CreatedAt",
        name: "createdAt",
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
      const limit: number | string = parseInt(`${req.query.limit}`) || 0;
      let page: number | string = parseInt(`${req.query.page}`) || 1;
      let setField = FilterQuery.getField(fields);
      // let search: ISearch = {
      //   filter: ["workflow"],
      //   value: req.query.search || "",
      // };
      let isFilter = FilterQuery.getFilter(filters, stateFilter, undefined, [
        "_id",
        "user",
        "workflow",
        "action",
        "stateActive",
        "nextState",
        "roleprofile",
      ]);

      if (!isFilter.status) {
        return res
          .status(400)
          .json({ status: 400, msg: "Error, Filter Invalid " });
      }
      // End

      const getAll = await Db.find(isFilter.data).count();

      let pipelineResult: any = [
        {
          $match: isFilter.data,
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
        pipelineResult.push({ $limit: limit > 0 ? limit : getAll });
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

  create = async (req: Request | any, res: Response): Promise<any> => {
    req.body.user = req.userId;

    try {
      // Check workflow
      if (!req.body.workflow) {
        return res
          .status(400)
          .json({ status: 400, msg: "workflow wajib diisi!" });
      }
      const workflow = await Workflow.findById(`${req.body.workflow}`);
      if (!workflow) {
        return res
          .status(400)
          .json({ status: 400, msg: "workflow Tidak ditemukan!" });
      }
      // End

      // NextState
      if (!req.body.nextState) {
        return res
          .status(400)
          .json({ status: 400, msg: "nextState Required!" });
      }

      const nextState = await WorkflowState.findById(`${req.body.nextState}`);
      if (!nextState) {
        return res
          .status(400)
          .json({ status: 400, msg: "nextState Tidak ditemukan!" });
      }

      // End

      // CheckstateActive
      if (!req.body.stateActive) {
        return res
          .status(400)
          .json({ status: 400, msg: "stateActive Required!" });
      }

      const stateActive = await WorkflowState.findById(
        `${req.body.stateActive}`
      );
      if (!stateActive) {
        return res
          .status(400)
          .json({ status: 400, msg: "stateActive Tidak ditemukan!" });
      }

      // End

      // CheckAction
      if (!req.body.action) {
        return res.status(400).json({ status: 400, msg: "action Required!" });
      }
      const action = await WorkflowAction.findById(`${req.body.action}`);
      if (!action) {
        return res
          .status(400)
          .json({ status: 400, msg: "action Tidak ditemukan!" });
      }

      // End

      // Check roleprofile
      if (!req.body.roleprofile) {
        return res
          .status(400)
          .json({ status: 400, msg: "roleprofile Required!" });
      }

      const role = await RoleProfileModel.findById(`${req.body.roleprofile}`);
      if (!role) {
        return res
          .status(400)
          .json({ status: 400, msg: "roleprofile Tidak ditemukan!" });
      }
      // End

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
      // const cache = await Redis.client.get(`${redisName}-${req.params.id}`);
      // if (cache) {
      //   console.log("Cache");
      //   return res.status(200).json({ status: 200, data: JSON.parse(cache) });
      // }
      const result = await Db.findOne({ _id: req.params.id })
        .populate("user", "name")
        .populate("workflow", "name")
        .populate("stateActive", "name")
        .populate("action", "name")
        .populate("nextState", "name")
        .populate("roleprofile", "name");

      if (!result) {
        return res
          .status(404)
          .json({ status: 404, msg: "Error, Data tidak ditemukan!" });
      }

      // await Redis.client.set(
      //   `${redisName}-${req.params.id}`,
      //   JSON.stringify(result)
      // );
      return res.status(200).json({ status: 200, data: result });
    } catch (error) {
      return res.status(404).json({ status: 404, data: error });
    }
  };

  update = async (req: Request, res: Response): Promise<Response> => {
    try {
      const result = await Db.findOne({ _id: req.params.id });
      if (!result) {
        return res
          .status(404)
          .json({ status: 404, msg: "Error, Data tidak ditemukan!" });
      }

      // Check workflow
      if (req.body.workflow) {
        const workflow = await Workflow.findById(`${req.body.workflow}`);
        if (!workflow) {
          return res
            .status(400)
            .json({ status: 400, msg: "workflow Tidak ditemukan!" });
        }
      }

      // End

      // NextState
      if (req.body.nextState) {
        const nextState = await WorkflowState.findById(`${req.body.nextState}`);
        if (!nextState) {
          return res
            .status(400)
            .json({ status: 400, msg: "nextState Tidak ditemukan!" });
        }
      }

      // End

      // CheckstateActive
      if (req.body.stateActive) {
        const stateActive = await WorkflowState.findById(
          `${req.body.stateActive}`
        );
        if (!stateActive) {
          return res
            .status(400)
            .json({ status: 400, msg: "stateActive Tidak ditemukan!" });
        }
      }

      // End

      // CheckAction
      if (req.body.action) {
        const action = await WorkflowAction.findById(`${req.body.action}`);
        if (!action) {
          return res
            .status(400)
            .json({ status: 400, msg: "action Tidak ditemukan!" });
        }
      }

      // End

      // Check roleprofile
      if (req.body.roleprofile) {
        const role = await RoleProfileModel.findById(`${req.body.roleprofile}`);
        if (!role) {
          return res
            .status(400)
            .json({ status: 400, msg: "roleprofile Tidak ditemukan!" });
        }
      }

      // End

      await Db.findByIdAndUpdate(req.params.id, req.body);
      const getData = await Db.findOne({ _id: req.params.id })
        .populate("user", "name")
        .populate("workflow", "name")
        .populate("stateActive", "name")
        .populate("action", "name")
        .populate("nextState", "name")
        .populate("roleprofile", "name");

      // await Redis.client.set(
      //   `${redisName}-${req.params.id}`,
      //   JSON.stringify(getData)
      // );
      return res.status(200).json({ status: 200, data: getData });
    } catch (error: any) {
      return res.status(404).json({ status: 404, data: error });
    }
  };

  delete = async (req: Request, res: Response): Promise<Response> => {
    try {
      const getData: any = await Db.findOne({ _id: req.params.id });

      if (!getData) {
        return res
          .status(404)
          .json({ status: 404, msg: "Error, Data tidak ditemukan!" });
      }

      const result = await Db.deleteOne({ _id: req.params.id });
      // await Redis.client.del(`${redisName}-${req.params.id}`);
      return res.status(200).json({ status: 200, data: result });
    } catch (error) {
      return res.status(404).json({ status: 404, msg: error });
    }
  };
}

export default new WorkflowTransitionController();

import { Request, Response } from "express";
// import Redis from "../config/Redis";
import { IStateFilter } from "../Interfaces";
import { FilterQuery } from "../utils";
import IController from "./ControllerInterface";
import { TypeOfState } from "../Interfaces/FilterInterface";
import {
  RoleProfileModel,
  Workflow,
  WorkflowChanger,
  WorkflowState,
} from "../models";

const Db = WorkflowChanger;
const redisName = "workflowchanger";

class WorkflowChangerController implements IController {
  index = async (req: Request, res: Response): Promise<Response> => {
    const stateFilter: IStateFilter[] = [
      {
        alias: "User",
        name: "user",
        operator: ["=", "!="],
        typeOf: TypeOfState.String,
      },
      {
        alias: "selfApproval",
        name: "selfApproval",
        operator: ["=", "!="],
        typeOf: TypeOfState.String,
        isSort: true,
        listData: [
          { name: "0", value: 0 },
          { name: "1", value: 1 },
        ],
      },
      {
        alias: "Workflow",
        name: "workflow",
        operator: ["=", "!="],
        typeOf: TypeOfState.String,
        isSort: true,
      },

      {
        alias: "State",
        name: "state",
        operator: ["=", "!="],
        typeOf: TypeOfState.String,
      },

      {
        alias: "RoleProfile",
        name: "roleprofile",
        operator: ["=", "!="],
        typeOf: TypeOfState.String,
      },
      {
        alias: "UpdatedAt",
        name: "updatedAt",
        operator: ["=", "!=", , ">", "<", ">=", "<="],
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
            "name",
            "user._id",
            "user.name",
            "workflow._id",
            "workflow.name",
            "state._id",
            "state.name",
            "roleprofile._id",
            "roleprofile.name",
            "status",
          ];
      const order_by: any = req.query.order_by
        ? JSON.parse(`${req.query.order_by}`)
        : { updatedAt: -1 };
      const limit: number | string = parseInt(`${req.query.limit}`) || 0;
      let page: number | string = parseInt(`${req.query.page}`) || 1;
      let setField = FilterQuery.getField(fields);
      let isFilter = FilterQuery.getFilter(filters, stateFilter, undefined, [
        "workflow",
        "_id",
        "state",
        "roleprofile",
        "user",
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
            from: "workflows",
            localField: "workflow",
            foreignField: "_id",
            as: "workflow",
          },
        },
        {
          $lookup: {
            from: "workflowstates",
            localField: "state",
            foreignField: "_id",
            as: "state",
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
          $unwind: "$state",
        },
        {
          $unwind: "$roleprofile",
        },
        {
          $unwind: "$user",
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
    if (!req.body.status) {
      return res.status(400).json({ status: 400, msg: "status Required!" });
    }
    req.body.user = req.userId;

    try {
      // Check Workflow
      if (!req.body.workflow) {
        return res.status(400).json({ status: 400, msg: "workflow Required!" });
      }
      const workflow = await Workflow.findById(`${req.body.workflow}`);
      if (!workflow) {
        return res
          .status(400)
          .json({ status: 400, msg: "workflow tidak ditemukan!" });
      }
      // End

      // Check state
      if (!req.body.state) {
        return res.status(400).json({ status: 400, msg: "state Required!" });
      }
      const workflowState = await WorkflowState.findById(`${req.body.state}`);
      if (!workflowState) {
        return res
          .status(400)
          .json({ status: 400, msg: "workflowState tidak ditemukan!" });
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
          .json({ status: 400, msg: "roleprofile tidak ditemukan!" });
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
        .populate("state", "name");

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
      const data = await Db.findById(req.params.id);

      if (!data) {
        return res
          .status(404)
          .json({ status: 404, msg: "Error, Data tidak ditemukan!" });
      }

      // Check Workflow
      if (req.body.workflow) {
        const workflow = await Workflow.findById(`${req.body.workflow}`);
        if (!workflow) {
          return res
            .status(400)
            .json({ status: 400, msg: "workflow tidak ditemukan!" });
        }
      }

      // End

      // Check state
      if (req.body.state) {
        const workflowState = await WorkflowState.findById(`${req.body.state}`);
        if (!workflowState) {
          return res
            .status(400)
            .json({ status: 400, msg: "workflowState tidak ditemukan!" });
        }
      }
      // End

      // Check roleprofile
      if (req.body.workflow) {
        const role = await RoleProfileModel.findById(`${req.body.roleprofile}`);
        if (!role) {
          return res
            .status(400)
            .json({ status: 400, msg: "roleprofile tidak ditemukan!" });
        }
      }

      // End

      await Db.updateOne({ _id: req.params.id }, req.body);
      const result = await Db.findOne({ _id: req.params.id })
        .populate("user", "name")
        .populate("workflow", "name")
        .populate("state", "name");
      // await Redis.client.set(
      //   `${redisName}-${req.params.id}`,
      //   JSON.stringify(result)
      // );
      return res.status(200).json({ status: 200, data: result });
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

export default new WorkflowChangerController();

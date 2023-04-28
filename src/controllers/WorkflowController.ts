import { Request, Response } from "express";
import Redis from "../config/Redis";
import { IStateFilter } from "../Interfaces";
import { FilterQuery } from "../utils";
import IController from "./ControllerInterface";
import { TypeOfState } from "../Interfaces/FilterInterface";
import {
  RoleProfile,
  RoleUser,
  Workflow,
  WorkflowChanger,
  WorkflowTransition,
} from "../models";
import mongoose, { ObjectId } from "mongoose";
import { ISearch } from "../utils/FilterQuery";

const Db = Workflow;
const redisName = "workflow";

class workflowStateController implements IController {
  index = async (req: Request, res: Response): Promise<Response> => {
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
        name: "doc",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
      },
      {
        name: "user.name",
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
        : ["name", "user.name", "doc"];
      const order_by: any = req.query.order_by
        ? JSON.parse(`${req.query.order_by}`)
        : { updatedAt: -1 };
      const limit: number | string = parseInt(`${req.query.limit}`) || 10;
      let page: number | string = parseInt(`${req.query.page}`) || 1;
      let setField = FilterQuery.getField(fields);
      let search: ISearch = {
        filter: ["name", "doc"],
        value: req.query.search || "",
      };
      let isFilter = FilterQuery.getFilter(filters, stateFilter, search);

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
          $unwind: "$user",
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

  create = async (req: Request | any, res: Response): Promise<Response> => {
    if (!req.body.name) {
      return res.status(400).json({ status: 400, msg: "name Required!" });
    }
    if (!req.body.doc) {
      return res.status(400).json({ status: 400, msg: "doc Required!" });
    }
    req.body.user = req.userId;
    try {
      const doctype = ["schedule"];

      const cekDocType = doctype.find((item) => item == req.body.doc);
      if (!cekDocType) {
        return res
          .status(400)
          .json({ status: 400, msg: "Document not found!" });
      }

      const result = new Db(req.body);
      const response = await result.save();
      return res.status(200).json({ status: 200, data: response });
    } catch (error) {
      return res.status(400).json({ status: 400, data: error });
    }
  };

  show = async (req: Request, res: Response): Promise<Response> => {
    try {
      const cache = await Redis.client.get(`${redisName}-${req.params.id}`);
      if (cache) {
        console.log("Cache");
        return res.status(200).json({ status: 200, data: JSON.parse(cache) });
      }
      const result = await Db.findOne({ _id: req.params.id }).populate(
        "user",
        "name"
      );
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
      const result = await Db.updateOne({ _id: req.params.id }, req.body);
      const getData = await Db.findOne({ _id: req.params.id });
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

  getButtonAction = async (
    doc: String,
    user: ObjectId,
    stateActive: String
  ): Promise<any[]> => {
    let data: any[] = [];
    const workflow: any = await Workflow.findOne({
      $and: [{ status: 1 }, { doc: doc }],
    });

    if (workflow) {
      const id_workflow = workflow._id;
      const transitions: any = await WorkflowTransition.find({
        workflow: id_workflow,
      })
        .populate("workflow", "name")
        .populate("action", "name")
        .populate("nextState", "name")
        .populate("stateActive", "name")
        .populate("roleprofile", "name");

      let allData = [];
      for (const transition of transitions) {
        if (transition.selfApproval) {
          if (
            `${new mongoose.Types.ObjectId(`${user}`)}` === `${transition.user}`
          ) {
            allData.push(transition);
          }
        } else {
          const validAccessRole = await RoleUser.findOne({
            $and: [
              { user: new mongoose.Types.ObjectId(`${user}`) },
              { roleprofile: transition.roleprofile },
            ],
          });
          if (validAccessRole) {
            allData.push(transition);
          }
        }
      }

      data = allData.map((item: any) => {
        if (item.stateActive.name == stateActive) {
          return {
            id_workflow: id_workflow,
            name: item.action.name,
            nextstate: {
              id: item.nextState._id,
              name: item.nextState.name,
            },
          };
        }
      });
      const genData = data.filter((item) => item !== undefined);

      return genData;
    }
    return data;
  };

  permissionUpdateAction = async (
    workflow: string,
    user: string,
    state: string,
    createdBy: string
  ) => {
    const changer: any = await WorkflowChanger.findOne({
      workflow: workflow,
      state: state,
    })
      .populate("user", "name")
      .populate("workflow", "name")
      .populate("state", "name");

    if (changer) {
      if (changer.selfApproval) {
        if (`${new mongoose.Types.ObjectId(`${user}`)}` === `${createdBy}`) {
          return {
            status: true,
            data: { status: changer.status, workflowState: changer.state.name },
          };
        } else {
          return {
            status: false,
            msg: "Permission Denied",
          };
        }
      } else {
        const roleId = changer.roleprofile;
        const validAccessRole = await RoleUser.findOne({
          $and: [
            { user: new mongoose.Types.ObjectId(`${user}`) },
            { roleprofile: roleId },
          ],
        });
        if (validAccessRole) {
          return {
            status: true,
            data: { status: changer.status, workflowState: changer.state.name },
          };
        } else {
          return {
            status: false,
            msg: "Permission Denied",
          };
        }
      }
    }
    return {
      status: false,
      msg: "WorkState not found!",
    };
  };
}

export default new workflowStateController();

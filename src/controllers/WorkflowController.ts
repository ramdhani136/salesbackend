import { Request, Response } from "express";
// import Redis from "../config/Redis";
import { IStateFilter } from "../Interfaces";
import { FilterQuery } from "../utils";
import IController from "./ControllerInterface";
import { TypeOfState } from "../Interfaces/FilterInterface";
import {
  History,
  RoleUserModel,
  Workflow,
  WorkflowChanger,
  WorkflowTransition,
} from "../models";

import { ISearch } from "../utils/FilterQuery";
import HistoryController from "./HistoryController";
import { ObjectId } from "mongodb";

const Db = Workflow;
const redisName = "workflow";

class workflowStateController implements IController {
  index = async (req: Request, res: Response): Promise<Response> => {
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
        alias: "Doc",
        name: "doc",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
        isSort: true,
      },
      {
        alias: "User",
        name: "user",
        operator: ["=", "!="],
        typeOf: TypeOfState.String,
      },

      {
        alias: "UpdatedAt",
        name: "updatedAt",
        operator: ["=", "!=", "like", "notlike", ">", "<", ">=", "<="],
        typeOf: TypeOfState.Date,
        isSort: true,
      },
      {
        alias: "CreatedAt",
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
        : [];
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
      let isFilter = FilterQuery.getFilter(filters, stateFilter, search, [
        "_id",
        "user",
      ]);

      if (!isFilter.status) {
        return res
          .status(400)
          .json({ status: 400, msg: "Error, Filter Invalid " });
      }
      // End
      const getAll = await Db.find(isFilter.data).count();
      const result = await Db.find(isFilter.data, setField)
        .populate("user", "name")
        .limit(limit)
        .skip(limit > 0 ? page * limit - limit : 0)
        .sort(order_by);

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
    if (!req.body.name) {
      return res.status(400).json({ status: 400, msg: "name Required!" });
    }
    if (!req.body.doc) {
      return res.status(400).json({ status: 400, msg: "doc Required!" });
    }
    req.body.user = req.userId;
    try {
      const doctype = [
        "visit",
        "callsheet",
        "branch",
        "schedule",
        "user",
        "contact",
        "customergroup",
        "customer",
        "roleprofile",
        "roleuser",
        "permission",
        "usergroup",
        "memo",
      ];

      const cekDocType = doctype.find((item) => item == req.body.doc);
      if (!cekDocType) {
        return res
          .status(400)
          .json({ status: 400, msg: "Document not found!" });
      }

      const result = new Db(req.body);
      const response = await result.save();

      //push history
      await HistoryController.pushHistory({
        document: {
          _id: response._id,
          name: response.name,
          type: redisName,
        },
        message: `${req.user} menambahkan workflow ${response.name} `,
        user: req.userId,
      });
      //End

      return res.status(200).json({ status: 200, data: response });
    } catch (error) {
      return res.status(400).json({ status: 400, data: error });
    }
  };

  show = async (req: Request, res: Response): Promise<Response> => {
    try {
      const getHistory = await History.find(
        {
          $and: [
            { "document._id": req.params.id },
            { "document.type": redisName },
          ],
        },
        ["_id", "message", "createdAt", "updatedAt"]
      )
        .populate("user", "name")
        .sort({ createdAt: -1 });

      // const cache = await Redis.client.get(`${redisName}-${req.params.id}`);
      // if (cache) {
      //   console.log("Cache");
      //   return res.status(200).json({
      //     status: 200,
      //     data: JSON.parse(cache),
      //     history: getHistory,
      //   });
      // }
      const result = await Db.findOne({ _id: req.params.id }).populate(
        "user",
        "name"
      );

      if (!result) {
        return res
          .status(404)
          .json({ status: 404, msg: "Error, Data tidak ditemukan!" });
      }

      // await Redis.client.set(
      //   `${redisName}-${req.params.id}`,
      //   JSON.stringify(result)
      // );
      return res.status(200).json({
        status: 200,
        data: result,
        history: getHistory,
      });
    } catch (error) {
      return res.status(404).json({ status: 404, data: error });
    }
  };

  update = async (req: Request, res: Response): Promise<Response> => {
    try {
      const prevData: any = await Db.findOne({ _id: req.params.id }).populate(
        "user",
        "name"
      );
      if (!prevData) {
        return res
          .status(404)
          .json({ status: 404, msg: "Error, Data tidak ditemukan!" });
      }
      await Db.findByIdAndUpdate({ _id: req.params.id }, req.body).populate(
        "user",
        "name"
      );

      if (req.body.status == 1) {
        if (prevData.status !== 1) {
          await Db.updateMany(
            {
              $and: [
                { status: 1 },
                { doc: req.body.doc ? req.body.doc : prevData.doc },
                {
                  _id: { $ne: req.params.id },
                },
              ],
            },
            { status: 0 }
          );
        }
      }

      const resultData: any = await Db.findOne({ _id: req.params.id }).populate(
        "user",
        "name"
      );

      // await Redis.client.set(
      //   `${redisName}-${req.params.id}`,
      //   JSON.stringify(resultData)
      // );
      return res.status(200).json({ status: 200, data: resultData });
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

      if (getData.status === "1") {
        return res
          .status(404)
          .json({ status: 404, msg: "Error, status dokumen aktif!" });
      }

      const result = await Db.deleteOne({ _id: req.params.id });
      // await Redis.client.del(`${redisName}-${req.params.id}`);
      // Delete Child
      await this.DeletedRelateChild(new ObjectId(req.params.id));
      // End
      return res.status(200).json({ status: 200, data: result });
    } catch (error) {
      return res.status(404).json({ status: 404, msg: error });
    }
  };

  protected DeletedRelateChild = async (id: ObjectId): Promise<any> => {
    try {
      await WorkflowTransition.deleteMany({
        workflow: id,
      });
    } catch (error) {
      throw error;
    }
    try {
      await WorkflowChanger.deleteMany({
        workflow: id,
      });
    } catch (error) {
      throw error;
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
          if (`${new ObjectId(`${user}`)}` === `${transition.user}`) {
            allData.push(transition);
          }
        } else {
          const validAccessRole = await RoleUserModel.findOne({
            $and: [
              { user: new ObjectId(`${user}`) },
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
            action: item.action.name,
            nextState: {
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
    doc: String,
    user: string,
    state: string,
    createdBy: string
  ) => {
    const getData: any = await WorkflowChanger.aggregate([
      { $match: { state: new ObjectId(state) } },
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "user",
          pipeline: [
            {
              $project: { _id: 1, name: 1 },
            },
          ],
        },
      },
      {
        $unwind: "$user",
      },
      {
        $lookup: {
          from: "workflowstates",
          localField: "state",
          foreignField: "_id",
          as: "state",
          pipeline: [
            {
              $project: { _id: 1, name: 1 },
            },
          ],
        },
      },
      {
        $unwind: "$state",
      },
      {
        $lookup: {
          from: "workflows",
          localField: "workflow",
          foreignField: "_id",
          as: "workflow",
          pipeline: [
            {
              $project: { _id: 1, name: 1, doc: 1 },
            },
          ],
        },
      },
      {
        $unwind: "$workflow",
      },
      { $match: { "workflow.doc": doc } },
    ]);

    if (getData.length > 0) {
      const changer = getData[0];
      if (changer.selfApproval) {
        if (`${new ObjectId(`${user}`)}` === `${createdBy}`) {
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
        const validAccessRole = await RoleUserModel.findOne({
          $and: [{ user: new ObjectId(`${user}`) }, { roleprofile: roleId }],
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

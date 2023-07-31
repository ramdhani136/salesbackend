import { Request, Response } from "express";
// import Redis from "../config/Redis";
import { IStateFilter } from "../Interfaces";
import { FilterQuery } from "../utils";
import IController from "./ControllerInterface";
import {
  CallsheetModel,
  CustomerModel,
  History,
  NotesModel,
  PermissionModel,
  TagModel,
  TopicModel,
  visitModel,
} from "../models";
import { TypeOfState } from "../Interfaces/FilterInterface";
import { HistoryController, WorkflowController } from ".";
import { ISearch } from "../utils/FilterQuery";
import { PermissionMiddleware } from "../middleware";
import {
  selPermissionAllow,
  selPermissionType,
} from "../middleware/PermissionMiddleware";
import { ObjectId } from "mongodb";

const Db = NotesModel;
const redisName = "notes";

class NotesController implements IController {
  getDataByAlias(
    aliasList: String[],
    stateFilter: IStateFilter[],
    not: Boolean = false
  ) {
    const filteredData = [];
    let Data: String[];
    for (const filter of stateFilter) {
      if (
        not
          ? !aliasList.includes(filter.alias)
          : aliasList.includes(filter.alias)
      ) {
        filteredData.push(filter);
      }
    }
    return filteredData;
  }

  index = async (req: Request | any, res: Response): Promise<Response> => {
    const stateFilter: IStateFilter[] = [
      {
        alias: "Id",
        name: "_id",
        operator: ["=", "!="],
        typeOf: TypeOfState.String,
      },
      {
        alias: "Task",
        name: "task",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
        isSort: true,
      },
      {
        alias: "Customer",
        name: "customer",
        operator: ["=", "!="],
        typeOf: TypeOfState.String,
        isSort: true,
      },
      {
        alias: "Topic",
        name: "topic",
        operator: ["=", "!="],
        typeOf: TypeOfState.String,
        isSort: true,
      },
      {
        alias: "Tag",
        name: "tags",
        operator: ["=", "!="],
        typeOf: TypeOfState.String,
        isSort: true,
      },
      {
        alias: "Doc Type",
        name: "doc.type",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
        isSort: true,
      },
      {
        alias: "Doc Id",
        name: "doc._id",
        operator: ["=", "!="],
        typeOf: TypeOfState.String,
        isSort: true,
      },
      {
        alias: "Doc Name",
        name: "doc.name",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
        isSort: true,
      },
      {
        alias: "CustomerGroup",
        name: "customer.customerGroup",
        operator: ["=", "!="],
        typeOf: TypeOfState.String,
        isSort: true,
      },
      {
        alias: "Branch",
        name: "customer.branch",
        operator: ["=", "!="],
        typeOf: TypeOfState.String,
        isSort: true,
      },
      {
        alias: "Created By",
        name: "createdBy._id",
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
      const filterOther = ["customer.customerGroup", "customer.branch"];

      // const filteredData = this.getDataByAlias(filterOther, stateFilter, true);

      // Mengambil query
      const filters: any = req.query.filters
        ? JSON.parse(`${req.query.filters}`)
        : [];
      // const fields: any = req.query.fields
      //   ? JSON.parse(`${req.query.fields}`)
      //   : [
      //       "name",
      //       "lat",
      //       "lng",
      //       "desc",
      //       "workflowState",
      //       "createdBy.name",
      //       "status",
      //       "updatedAt",
      //     ];
      const order_by: any = req.query.order_by
        ? JSON.parse(`${req.query.order_by}`)
        : { updatedAt: -1 };
      const limit: number | string = parseInt(`${req.query.limit}`) || 0;
      let page: number | string = parseInt(`${req.query.page}`) || 1;
      let search: ISearch = {
        filter: ["doc.name", "workflowState"],
        value: req.query.search || "",
      };

      // // Mengambil hasil fields
      // let setField = FilterQuery.getField(fields);
      // // End

      const filtersOne = filters.filter(
        (item: string[]) => !filterOther.includes(item[0])
      );
      // Mengambil hasil filter
      let isFilter = FilterQuery.getFilter(filtersOne, stateFilter, search, [
        "createdBy",
        "_id",
        "doc._id",
        "customer",
        "topic",
        "tags",
      ]);
      // End

      const filters2 = filters.filter((item: string[]) =>
        filterOther.includes(item[0])
      );
      // Mengambil hasil filter
      let isFilter2 = FilterQuery.getFilter(filters2, stateFilter, undefined, [
        "customer.customerGroup",
        "customer.branch",
      ]);
      // End

      // Validasi apakah filter valid

      if (!isFilter.status) {
        return res
          .status(400)
          .json({ status: 400, msg: "Error, Filter Invalid " });
      }

      console.log(JSON.stringify(isFilter2.data));

      // End

      let pipelineTotal: any = [
        {
          $match: isFilter.data,
        },
        {
          $lookup: {
            from: "users",
            localField: "createdBy",
            foreignField: "_id",
            as: "createdBy",
            pipeline: [{ $project: { name: 1 } }],
          },
        },
        {
          $unwind: "$createdBy",
        },
        {
          $lookup: {
            from: "customers",
            localField: "customer",
            foreignField: "_id",
            as: "customer",
            pipeline: [{ $project: { name: 1, customerGroup: 1, branch: 1 } }],
          },
        },
        {
          $unwind: "$customer",
        },
        {
          $lookup: {
            from: "topics",
            localField: "topic",
            foreignField: "_id",
            as: "topic",
            pipeline: [{ $project: { name: 1 } }],
          },
        },
        {
          $unwind: "$topic",
        },
        {
          $lookup: {
            from: "tags",
            localField: "tags",
            foreignField: "_id",
            as: "tags",
            pipeline: [{ $project: { name: 1 } }],
          },
        },
        // {
        //   $project: setField,
        // },
        {
          $match: isFilter2.data,
        },

        {
          $count: "total_orders",
        },
      ];

      const totalData = await Db.aggregate(pipelineTotal);

      const getAll = totalData.length > 0 ? totalData[0].total_orders : 0;

      let pipelineResult: any = [
        {
          $match: isFilter.data,
        },
        {
          $sort: order_by,
        },
        {
          $lookup: {
            from: "users",
            localField: "createdBy",
            foreignField: "_id",
            as: "createdBy",
            pipeline: [{ $project: { name: 1 } }],
          },
        },
        {
          $unwind: "$createdBy",
        },
        {
          $lookup: {
            from: "customers",
            localField: "customer",
            foreignField: "_id",
            as: "customer",
            pipeline: [{ $project: { name: 1, customerGroup: 1, branch: 1 } }],
          },
        },
        {
          $unwind: "$customer",
        },
        {
          $lookup: {
            from: "topics",
            localField: "topic",
            foreignField: "_id",
            as: "topic",
            pipeline: [{ $project: { name: 1 } }],
          },
        },
        {
          $unwind: "$topic",
        },
        {
          $lookup: {
            from: "tags",
            localField: "tags",
            foreignField: "_id",
            as: "tags",
            pipeline: [{ $project: { name: 1 } }],
          },
        },

        {
          $skip: limit > 0 ? page * limit - limit : 0,
        },

        {
          $match: isFilter2.data,
        },
        // {
        //   $project: setField,
        // },
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

  create = async (req: Request | any, res: Response): Promise<Response> => {
    try {
      if (!req.body.customer) {
        throw "Customer wajib diisi!";
      }

      // Cek customer
      const customer = await CustomerModel.findById(req.body.customer, [
        "_id",
        "status",
      ]);

      if (!customer) {
        throw "Customer tidak ditemukan!";
      }
      if (customer.status === "0") {
        throw "Customer tidak aktif!";
      }
      // End

      if (!req.body.result) {
        throw "Result wajib diisi!";
      }

      // Cek topic
      if (!req.body.topic) {
        throw "Topic wajib diisi!";
      }

      const topic = await TopicModel.findById(req.body.topic, [
        "_id",
        "status",
        "tags",
      ]);

      if (!topic) {
        throw "Topic tidak ditemukan!";
      }
      if (topic.status === "0") {
        throw "Topic tidak aktif!";
      }

      // End

      if (!req.body.tags) {
        throw "Error, tags wajib diisi!";
      }

      if (typeof req.body.tags !== "object") {
        throw "Error, tags harus berupa object!";
      }

      if (req.body.tags.length === 0) {
        throw "Error, tags harus diisi minimal 1 tag!";
      }

      for (const item of req.body.tags) {
        let getTag: any = await TagModel.findById(new ObjectId(item), ["name"]);
        if (!getTag) {
          return res.status(400).json({
            status: 400,
            msg: `Error, tag ${item} tidak ditemukan!`,
          });
        }

        // Cek restrict tags
        if (topic.tags) {
          if (topic.tags.restrict.length > 0) {
            let validTags = topic.tags.restrict.includes(item);
            if (!validTags) {
              throw `Tidak dapat menambahkan tag ${getTag.name}`;
            }
          }
        }
        // End
      }

      if (!req.body.doc) {
        throw "Error, Doc wajib diisi!";
      }
      if (!req.body.doc.type) {
        throw "Error, Doc.type wajib diisi!";
      }

      // Cek type
      if (req.body.doc.type !== "visit" && req.body.doc.type !== "callsheet") {
        throw "Error, Type wajib diisi visit, callsheet!";
      }
      // End

      if (!req.body.doc._id) {
        throw "Error, Doc._id wajib diisi!";
      }

      let DBDoc: any;

      if (req.body.doc.type === "visit") {
        DBDoc = visitModel;
      } else {
        DBDoc = CallsheetModel;
      }

      // Cek doc terdapat di database
      const validDoc = await DBDoc.findById(req.body.doc._id, ["name"]);
      if (!validDoc) {
        throw `Doc tidak ditemukan! `;
      }
      // End

      req.body.doc.name = validDoc.name;
      req.body.createdBy = req.userId;

      const result = new Db(req.body);
      const response = await result.save();

      // // push history
      // await HistoryController.pushHistory({
      //   document: {
      //     _id: response._id,
      //     name: response.name,
      //     type: redisName,
      //   },
      //   message: `Membuat ${redisName} baru`,
      //   user: req.userId,
      // });
      // // End

      // await Redis.client.set(
      //   `${redisName}-${response._id}`,
      //   JSON.stringify(response),
      //   {
      //     EX: 30,
      //   }
      // );

      return res.status(200).json({ status: 200, data: response });
    } catch (error: any) {
      return res.status(400).json({ status: 400, msg: error.errors ?? error });
    }
  };

  show = async (req: Request | any, res: Response): Promise<any> => {
    try {
      // Mengecek permission user
      const userPermission = await PermissionMiddleware.getPermission(
        req.userId,
        selPermissionAllow.USER,
        selPermissionType.BRANCH
      );
      // End

      // Mengecek permission branch
      const branchPermission = await PermissionMiddleware.getPermission(
        req.userId,
        selPermissionAllow.BRANCH,
        selPermissionType.BRANCH
      );
      // End

      // const cache = await Redis.client.get(`${redisName}-${req.params.id}`);

      // if (cache) {
      //   const isCache = JSON.parse(cache);

      //   if (userPermission.length > 0) {
      //     const validPermission = userPermission.find((item) => {
      //       return item.toString() === isCache.createdBy._id.toString();
      //     });

      //     if (!validPermission) {
      //       return res
      //         .status(404)
      //         .json({ status: 404, msg: "Data tidak ditemukan!" });
      //     }
      //   }

      //   if (branchPermission.length > 0) {
      //     const validBranchPermission = branchPermission.find((item) => {
      //       return item.toString() === isCache.createdBy._id.toString();
      //     });

      //     if (!validBranchPermission) {
      //       return res
      //         .status(404)
      //         .json({ status: 404, msg: "Data tidak ditemukan!" });
      //     }
      //   }

      //   const getHistory = await History.find(
      //     {
      //       $and: [
      //         { "document._id": `${isCache._id}` },
      //         { "document.type": redisName },
      //       ],
      //     },

      //     ["_id", "message", "createdAt", "updatedAt"]
      //   )
      //     .populate("user", "name")
      //     .sort({ createdAt: -1 });
      //   const buttonActions = await WorkflowController.getButtonAction(
      //     redisName,
      //     req.userId,
      //     isCache.workflowState
      //   );
      //   return res.status(200).json({
      //     status: 200,
      //     data: JSON.parse(cache),
      //     history: getHistory,
      //     workflow: buttonActions,
      //   });
      // }

      let pipeline: any = [{ _id: req.params.id }];

      if (userPermission.length > 0) {
        pipeline.push({ createdBy: { $in: userPermission } });
      }

      if (branchPermission.length > 0) {
        pipeline.push({ _id: { $in: branchPermission } });
      }

      const result: any = await Db.findOne({
        $and: pipeline,
      }).populate("createdBy", "name");

      if (!result) {
        return res
          .status(404)
          .json({ status: 404, msg: "Data tidak ditemukan!" });
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

      // await Redis.client.set(
      //   `${redisName}-${req.params.id}`,
      //   JSON.stringify(result),
      //   {
      //     EX: 30,
      //   }
      // );

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
      // Mengecek permission user
      const userPermission = await PermissionMiddleware.getPermission(
        req.userId,
        selPermissionAllow.USER,
        selPermissionType.BRANCH
      );
      // End
      // Mengecek permission user
      const branchPermission = await PermissionMiddleware.getPermission(
        req.userId,
        selPermissionAllow.BRANCH,
        selPermissionType.BRANCH
      );
      // End
      let pipeline: any[] = [
        {
          _id: req.params.id,
        },
      ];

      if (userPermission.length > 0) {
        pipeline.push({ createdBy: { $in: userPermission } });
      }

      if (branchPermission.length > 0) {
        pipeline.push({ _id: { $in: branchPermission } });
      }

      const result: any = await Db.findOne({
        $and: pipeline,
      }).populate("createdBy", "name");

      if (result) {
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
        // await Redis.client.set(
        //   `${redisName}-${req.params.id}`,
        //   JSON.stringify(getData),
        //   {
        //     EX: 30,
        //   }
        // );

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
      // Mengecek permission user
      const userPermission = await PermissionMiddleware.getPermission(
        req.userId,
        selPermissionAllow.USER,
        selPermissionType.BRANCH
      );
      // End
      // Mengecek permission user
      const branchPermission = await PermissionMiddleware.getPermission(
        req.userId,
        selPermissionAllow.BRANCH,
        selPermissionType.BRANCH
      );
      // End

      let pipeline: any[] = [
        {
          _id: req.params.id,
        },
      ];

      if (userPermission.length > 0) {
        pipeline.push({ createdBy: { $in: userPermission } });
      }

      if (branchPermission.length > 0) {
        pipeline.push({ _id: { $in: branchPermission } });
      }

      const result = await Db.findOne({ $and: pipeline });

      if (!result) {
        return res
          .status(404)
          .json({ status: 404, msg: "Error, Data tidak ditemukan!" });
      }

      // Cek apakah digunakan di permission data
      const permission = await PermissionModel.findOne(
        {
          $and: [
            { allow: "branch" },
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
          msg: "Branch ini sudah digunakan oleh data permission!",
        });
      }
      // End

      // if (result.status === "1") {
      //   return res
      //     .status(404)
      //     .json({ status: 404, msg: "Error, status dokumen aktif!" });
      // }

      const actionDel = await Db.findOneAndDelete({ _id: req.params.id });
      // await Redis.client.del(`${redisName}-${req.params.id}`);
      // push history
      // await HistoryController.pushHistory({
      //   document: {
      //     _id: result._id,
      //     name: result.name,
      //     type: redisName,
      //   },
      //   message: `Menghapus ${redisName} nomor ${result.name}`,
      //   user: req.userId,
      // });
      // // End
      return res.status(200).json({ status: 200, data: actionDel });
    } catch (error) {
      return res.status(404).json({ status: 404, msg: error });
    }
  };
}

export default new NotesController();

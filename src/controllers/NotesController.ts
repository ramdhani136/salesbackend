import { Request, Response } from "express";
import { IStateFilter } from "../Interfaces";
import { FilterQuery, cekValidPermission } from "../utils";
import IController from "./ControllerInterface";
import path from "path";
import fs from "fs";
import {
  CallsheetModel,
  CustomerModel,
  FileModel,
  NotesModel,
  TagModel,
  TopicModel,
  visitModel,
} from "../models";
import { TypeOfState } from "../Interfaces/FilterInterface";
import { WorkflowController } from ".";
import { ISearch } from "../utils/FilterQuery";
import { PermissionMiddleware } from "../middleware";
import {
  selPermissionAllow,
  selPermissionType,
} from "../middleware/PermissionMiddleware";
import { ObjectId } from "bson";

const Db = NotesModel;
const redisName = "notes";

class NotesController implements IController {
  getDataByAlias(
    aliasList: String[],
    stateFilter: IStateFilter[],
    not: Boolean = false
  ) {
    const filteredData = [];

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
        alias: "Task",
        name: "task",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
        isSort: true,
      },
      {
        alias: "Result",
        name: "result",
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
        operator: ["=", "!="],
        typeOf: TypeOfState.String,
        isSort: true,
        listData: [
          { name: "Visit", value: "visit" },
          { name: "Callsheet", value: "callsheet" },
        ],
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
        name: "customerGroup",
        operator: ["=", "!="],
        typeOf: TypeOfState.String,
        isSort: true,
      },
      {
        alias: "Branch",
        name: "branch",
        operator: ["=", "!="],
        typeOf: TypeOfState.String,
        isSort: true,
      },
      {
        alias: "Created By",
        name: "createdBy",
        operator: ["=", "!="],
        typeOf: TypeOfState.String,
      },
      {
        alias: "Callsheet Type",
        name: "doc.callType",
        operator: ["=", "!="],
        typeOf: TypeOfState.String,
        isSort: true,
        listData: [
          { value: "in", name: "In" },
          { value: "out", name: "Out" },
        ],
      },
      {
        alias: "Visit Type",
        name: "doc.visitType",
        operator: ["=", "!="],
        typeOf: TypeOfState.String,
        isSort: true,
        listData: [
          { value: "insite", name: "Insite" },
          { value: "outsite", name: "OutSite" },
        ],
      },
      {
        alias: "WorkflowState",
        name: "workflowState",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
        isSort: true,
      },
      {
        alias: "Schedule",
        name: "schedule.name",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
        isSort: true,
      },
      {
        alias: "Response",
        name: "response",
        operator: ["like", "notlike"],
        typeOf: TypeOfState.String,
        isSort: true,
      },
      {
        alias: "UpdatedAt",
        name: "updatedAt",
        operator: ["=", "!=", ">", "<", ">=", "<="],
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
      // Mengambil rincian permission customer
      const customerPermission = await PermissionMiddleware.getPermission(
        req.userId,
        selPermissionAllow.CUSTOMER,
        selPermissionType.NOTES
      );
      // End

      // Mengambil rincian permission group
      const groupPermission = await PermissionMiddleware.getPermission(
        req.userId,
        selPermissionAllow.CUSTOMERGROUP,
        selPermissionType.NOTES
      );
      // End

      // Mengambil rincian permission user
      const userPermission = await PermissionMiddleware.getPermission(
        req.userId,
        selPermissionAllow.USER,
        selPermissionType.NOTES
      );
      // End

      // Mengambil rincian permission branch
      const branchPermission = await PermissionMiddleware.getPermission(
        req.userId,
        selPermissionAllow.BRANCH,
        selPermissionType.NOTES
      );
      // End

      const filterOther = ["customerGroup", "branch"];

      // Mengambil query
      const filters: any = req.query.filters
        ? JSON.parse(`${req.query.filters}`)
        : [];
      const order_by: any = req.query.order_by
        ? JSON.parse(`${req.query.order_by}`)
        : { updatedAt: -1 };
      const limit: number | string = parseInt(`${req.query.limit}`) || 0;
      let page: number | string = parseInt(`${req.query.page}`) || 1;
      let search: ISearch = {
        filter: ["doc.name", "workflowState"],
        value: req.query.search || "",
      };

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

      // Validasi apakah filter valid

      if (!isFilter.status) {
        return res
          .status(400)
          .json({ status: 400, msg: "Error, Filter Invalid " });
      }

      // End

      let pipelineTotal: any = [isFilter.data];

      let pipelineResult: any = [
        {
          $match: isFilter.data,
        },
        {
          $sort: order_by,
        },
        {
          $skip: limit > 0 ? page * limit - limit : 0,
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
            from: "customergroups",
            localField: "customer.customerGroup",
            foreignField: "_id",
            as: "customerGroup",
            pipeline: [{ $project: { name: 1 } }],
          },
        },
        {
          $unwind: "$customerGroup",
        },
        {
          $lookup: {
            from: "branches",
            localField: "customer.branch",
            foreignField: "_id",
            as: "branch",
            pipeline: [{ $project: { name: 1 } }],
          },
        },
        {
          $unwind: "$branch",
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
          $project: {
            "customer.customerGroup": 0,
            "customer.branch": 0,
            __v: 0,
          },
        },
      ];

      //Menambahkan limit ketika terdapat limit

      if (limit > 0) {
        pipelineResult.splice(3, 0, { $limit: limit });
      }

      //  Cek Customer group dan branch
      // Mengambil hasil filter
      const filterBranchCustomer = filters.filter((item: string[]) =>
        filterOther.includes(item[0])
      );

      if (
        filterBranchCustomer.length > 0 ||
        branchPermission.length > 0 ||
        groupPermission.length > 0
      ) {
        const filterBranch = filterBranchCustomer.filter((item: string[]) =>
          ["branch"].includes(item[0])
        );

        const filterGroup = filterBranchCustomer.filter((item: string[]) =>
          ["customerGroup"].includes(item[0])
        );

        let isFilterBranch = FilterQuery.getFilter(
          filterBranch,
          stateFilter,
          undefined,
          ["branch"]
        );

        let pipelineCustomer: any = [isFilterBranch.data];

        const isGroup = filterGroup.map((item: any) => new ObjectId(item[2]));

        if (isGroup.length > 0) {
          const childGroup = await PermissionMiddleware.getCustomerChild(
            isGroup
          );

          if (childGroup.length > 0) {
            pipelineCustomer.unshift({ customerGroup: { $in: childGroup } });
          }
        }

        if (branchPermission.length > 0) {
          pipelineCustomer.unshift({ branch: { $in: branchPermission } });
        }

        if (groupPermission.length > 0) {
          pipelineCustomer.unshift({ customerGroup: { $in: groupPermission } });
        }

        const getCustomer = await CustomerModel.find(
          { $and: pipelineCustomer },
          ["_id"]
        );

        if (getCustomer.length === 0) {
          return res.status(400).json({
            status: 404,
            msg: "Data Not found!",
          });
        }

        const finalFilterCustomer = getCustomer.map((item) => {
          return item._id;
        });

        pipelineResult.unshift({
          $match: {
            customer: { $in: finalFilterCustomer },
          },
        });
        pipelineTotal.unshift({
          customer: { $in: finalFilterCustomer },
        });
      }

      // End

      // End

      // Cek permission customer
      if (customerPermission.length > 0) {
        pipelineResult.unshift({
          $match: {
            customer: { $in: customerPermission },
          },
        });
        pipelineTotal.unshift({
          customer: { $in: customerPermission },
        });
      }

      // End

      // Menambahkan filter berdasarkan permission user
      if (userPermission.length > 0) {
        pipelineResult.unshift({
          $match: {
            createdBy: { $in: userPermission.map((id) => new ObjectId(id)) },
          },
        });
        pipelineTotal.unshift({
          createdBy: { $in: userPermission.map((id) => new ObjectId(id)) },
        });
      }
      // End

      const totalData = await Db.countDocuments({ $and: pipelineTotal });
      const getAll = totalData > 0 ? totalData : 0;

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
        msg: "No data",
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
      // Cek topic
      if (!req.body.topic) {
        throw "Topic wajib diisi!";
      }

      if (!req.body.task) {
        throw "Activity wajib diisi!";
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

      if (!req.body.result) {
        throw "Feedback wajib diisi!";
      }

      // if (!req.body.tags) {
      //   throw "Error, tags wajib diisi!";
      // }

      // if (typeof req.body.tags !== "object") {
      //   throw "Error, tags harus berupa object!";
      // }

      // if (req.body.tags.length === 0) {
      //   throw "Error, tags harus diisi minimal 1 tag!";
      // }

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
        throw "Error, Doc: type, _id wajib diisi!";
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
      const validDoc = await DBDoc.findById(
        req.body.doc._id,
        req.body.doc.type == "callsheet"
          ? ["name", "customer", "type", "status", "workflowState"]
          : [
              "name",
              "customer",
              "status",
              "workflowState",
              "checkIn",
              "checkOut",
              "type",
            ]
      );
      if (!validDoc) {
        throw `Doc tidak ditemukan! `;
      }
      // End

      if (req.body.doc.type == "callsheet") {
        req.body.doc.callType = validDoc.type;
      }

      if (req.body.doc.type == "visit") {
        if (validDoc?.checkIn) {
          req.body.doc.checkIn = validDoc.checkIn;
        }
        if (validDoc?.checkOut) {
          req.body.doc.checkOut = validDoc.checkOut;
        }

        req.body.doc.visitType = validDoc.type;
      }

      req.body.doc.name = validDoc.name;
      req.body.doc.status = validDoc.status;
      req.body.doc.workflowState = validDoc.workflowState;
      req.body.customer = validDoc.customer;
      req.body.createdBy = req.userId;

      const result = new Db(req.body);
      const response = await result.save();

      return res.status(200).json({ status: 200, data: response });
    } catch (error: any) {
      console.log(error);
      return res.status(400).json({ status: 400, msg: error.errors ?? error });
    }
  };

  show = async (req: Request | any, res: Response): Promise<any> => {
    try {
      let pipeline: any = [{ _id: new ObjectId(req.params.id) }];

      const data = await Db.aggregate([
        {
          $match: {
            $and: pipeline,
          },
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
            from: "customergroups",
            localField: "customer.customerGroup",
            foreignField: "_id",
            as: "customerGroup",
            pipeline: [{ $project: { name: 1 } }],
          },
        },
        {
          $unwind: "$customerGroup",
        },
        {
          $lookup: {
            from: "branches",
            localField: "customer.branch",
            foreignField: "_id",
            as: "branch",
            pipeline: [{ $project: { name: 1 } }],
          },
        },
        {
          $unwind: "$branch",
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
          $project: {
            "customer.customerGroup": 0,
            "customer.branch": 0,
            __v: 0,
          },
        },
      ]);

      const result = data[0];

      if (!result) {
        return res
          .status(404)
          .json({ status: 404, msg: "Data tidak ditemukan!" });
      }

      const cekPermission = await cekValidPermission(
        req.userId,
        {
          user: result.createdBy._id,
          branch: result.branch._id,
          group: result.customerGroup._id,
          customer: result.customer._id,
        },
        selPermissionType.NOTES
      );

      if (!cekPermission) {
        return res.status(403).json({
          status: 403,
          msg: "Anda tidak mempunyai akses untuk dok ini!",
        });
      }

      return res.status(200).json({
        status: 200,
        data: result,
      });
    } catch (error) {
      return res.status(404).json({ status: 404, msg: error });
    }
  };

  update = async (req: Request | any, res: Response): Promise<any> => {
    try {
      let pipeline: any[] = [
        {
          _id: req.params.id,
        },
      ];

      const result: any = await Db.findOne(
        {
          $and: pipeline,
        },
        ["createdBy", "customer"]
      ).populate("customer", ["customerGroup", "branch"]);

      if (result) {
        const cekPermission = await cekValidPermission(
          req.userId,
          {
            user: result.createdBy,
            branch: result.customer.branch,
            group: result.customer.customerGroup,
            customer: result.customer._id,
          },
          selPermissionType.NOTES
        );

        if (!cekPermission) {
          return res.status(403).json({
            status: 403,
            msg: "Anda tidak mempunyai akses untuk dok ini!",
          });
        }

        const update = await Db.updateOne({ _id: req.params.id }, req.body);

        return res.status(200).json({ status: 200, data: update });
        // End
      } else {
        return res
          .status(400)
          .json({ status: 404, msg: "Error update, data not found" });
      }
    } catch (error: any) {
      return res.status(400).json({ status: 400, msg: error });
    }
  };

  delete = async (req: Request | any, res: Response): Promise<Response> => {
    try {
      const result: any = await Db.findOne(
        { _id: new ObjectId(req.params.id) },
        ["createdBy", "customer"]
      ).populate("customer", ["customerGroup", "branch"]);

      if (!result) {
        return res
          .status(404)
          .json({ status: 404, msg: "Error, Data tidak ditemukan!" });
      }

      const cekPermission = await cekValidPermission(
        req.userId,
        {
          user: result.createdBy,
          branch: result.customer.branch,
          group: result.customer.customerGroup,
          customer: result.customer._id,
        },
        selPermissionType.NOTES
      );

      if (!cekPermission) {
        return res.status(403).json({
          status: 403,
          msg: "Anda tidak mempunyai akses untuk dok ini!",
        });
      }

      this.deleteFileRelate(req.params.id);

      const actionDel = await Db.findOneAndDelete({ _id: req.params.id });

      return res.status(200).json({ status: 200, data: actionDel });
    } catch (error) {
      return res.status(400).json({ status: 404, msg: error });
    }
  };

  deleteFileRelate = async (id: String): Promise<any> => {
    try {
      const files = await FileModel.find({ note: id }, ["name"]);

      if (files.length > 0) {
        await FileModel.deleteMany({ _id: files.map((item) => item._id) });
        for (const item of files) {
          if (
            fs.existsSync(
              path.join(__dirname, `../../build/public/files/${item.name}`)
            )
          ) {
            fs.unlinkSync(
              path.join(__dirname, `../../build/public/files/${item.name}`)
            );
          }
        }
      }
    } catch (error) {
      console.log(error);
    }
  };
}

export default new NotesController();

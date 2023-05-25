import { Request, Response } from "express";
import Redis from "../config/Redis";
import { IStateFilter } from "../Interfaces";
import { FilterQuery } from "../utils";
import IController from "./ControllerInterface";
import { TypeOfState } from "../Interfaces/FilterInterface";
import {
  CallSheetNoteModel as Db,
  History,
  CallsheetModel,
  TagModel,
  CustomerModel,
} from "../models";
import { PermissionMiddleware } from "../middleware";
import {
  selPermissionAllow,
  selPermissionType,
} from "../middleware/PermissionMiddleware";
import { ObjectId } from "mongodb";
import HistoryController from "./HistoryController";
import { ISearch } from "../utils/FilterQuery";

const redisName = "callsheetnote";

class CallsheetNoteController implements IController {
  index = async (req: Request | any, res: Response): Promise<Response> => {
    const stateFilter: IStateFilter[] = [
      {
        name: "_id",
        operator: ["=", "!="],
        typeOf: TypeOfState.String,
      },

      {
        name: "title",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
      },
      {
        name: "callsheet._id",
        operator: ["=", "!="],
        typeOf: TypeOfState.String,
      },
      {
        name: "notes",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
      },

      {
        name: "tags",
        operator: ["=", "!="],
        typeOf: TypeOfState.String,
      },

      {
        name: "callsheet.name",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
      },
      {
        name: "callsheet.type",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
      },
      {
        name: "callsheet.rate",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
      },
      {
        name: "callsheet.status",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
      },
      {
        name: "callsheet.customer",
        operator: ["=", "!="],
        typeOf: TypeOfState.String,
      },
      {
        name: "callsheet.branch",
        operator: ["=", "!="],
        typeOf: TypeOfState.String,
      },
      {
        name: "callsheet.createdBy",
        operator: ["=", "!="],
        typeOf: TypeOfState.String,
      },
      {
        name: "callsheet.customer.customerGroup._id",
        operator: ["=", "!="],
        typeOf: TypeOfState.String,
      },
      {
        name: "callsheet.customer.customerGroup.name",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
      },
      {
        name: "callsheet.customer.branch._id",
        operator: ["=", "!="],
        typeOf: TypeOfState.String,
      },
      {
        name: "callsheet.customer.branch.name",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
      },
      {
        name: "createdAt",
        operator: ["=", "!=", "like", "notlike", ">", "<", ">=", "<="],
        typeOf: TypeOfState.Date,
      },
      {
        name: "updatedAt",
        operator: ["=", "!=", "like", "notlike", ">", "<", ">=", "<="],
        typeOf: TypeOfState.Date,
      },
    ];
    try {
      const filters: any = req.query.filters
        ? JSON.parse(`${req.query.filters}`)
        : [];
      // const fields: any = req.query.fields
      //   ? JSON.parse(`${req.query.fields}`)
      //   : ["_id", "title", "callsheet._id"];
      const order_by: any = req.query.order_by
        ? JSON.parse(`${req.query.order_by}`)
        : { updatedAt: -1 };
      const limit: number | string = parseInt(`${req.query.limit}`) || 10;
      let page: number | string = parseInt(`${req.query.page}`) || 1;
      // let setField = FilterQuery.getField(fields);
      let search: ISearch = {
        filter: ["title"],
        value: req.query.search || "",
      };

      const notCallsheetilter: any = filters.filter((item: any) => {
        const key = item[0]; // Ambil kunci pada indeks 0
        return !key.startsWith("callsheet."); // Kembalikan true jika kunci diawali dengan "schedule."
      });

      let isFilter = FilterQuery.getFilter(
        notCallsheetilter,
        stateFilter,
        search,
        ["_id", "tags"]
      );

      // Mengambil rincian permission user
      // const userPermission = await PermissionMiddleware.getPermission(
      //   req.userId,
      //   selPermissionAllow.USER,
      //   selPermissionType.CUSTOMER
      // );
      // End

      if (!isFilter.status) {
        return res
          .status(400)
          .json({ status: 400, msg: "Error, Filter Invalid " });
      }
      // End

      let pipeline: any = [
        // { $match: isFilter.data },
        {
          $sort: order_by,
        },
        {
          $skip: limit > 0 ? page * limit - limit : 0,
        },
        {
          $lookup: {
            from: "callsheets",
            localField: "callsheet",
            foreignField: "_id",
            as: "callsheet",
          },
        },
        {
          $unwind: "$callsheet",
        },
        {
          $lookup: {
            from: "customers",
            localField: "callsheet.customer",
            foreignField: "_id",
            as: "callsheet.customer",
          },
        },
        {
          $unwind: "$callsheet.customer",
        },
        {
          $lookup: {
            from: "contacts",
            localField: "callsheet.contact",
            foreignField: "_id",
            as: "callsheet.contact",
          },
        },
        {
          $unwind: "$callsheet.contact",
        },
        {
          $lookup: {
            from: "users",
            localField: "callsheet.createdBy",
            foreignField: "_id",
            as: "callsheet.createdBy",
          },
        },
        {
          $unwind: "$callsheet.createdBy",
        },
        {
          $lookup: {
            from: "customergroups",
            localField: "callsheet.customer.customerGroup",
            foreignField: "_id",
            as: "callsheet.customerGroup",
          },
        },
        {
          $unwind: "$callsheet.customerGroup",
        },
        {
          $lookup: {
            from: "branches",
            localField: "callsheet.customer.branch",
            foreignField: "_id",
            as: "callsheet.branch",
          },
        },
        {
          $unwind: "$callsheet.branch",
        },
        {
          $lookup: {
            from: "tags",
            localField: "tags",
            foreignField: "_id",
            as: "tags",
          },
        },

        {
          $lookup: {
            from: "schedulelists",
            localField: "callsheet.schedulelist",
            foreignField: "_id",
            as: "callsheet.schedulelist",
            pipeline: [
              {
                $lookup: {
                  from: "schedules",
                  localField: "schedule",
                  foreignField: "_id",
                  as: "schedule",
                },
              },
              {
                $unwind: "$schedule",
              },
              {
                $project: {
                  "schedule._id": 1,
                  "schedule.name": 1,
                  "schedule.closingDate": 1,
                },
              },
            ],
          },
        },
        {
          $project: {
            "callsheet.customer.customerGroup": 0,
            "callsheet.customer.branch": 0,
            "callsheet.customer.status": 0,
            "callsheet.customer.workflowState": 0,
            "callsheet.customer.createdAt": 0,
            "callsheet.customer.updatedAt": 0,
            "callsheet.contact.createdAt": 0,
            "callsheet.contact.updatedAt": 0,
            "callsheet.contact.customer": 0,
            "callsheet.contact.createdBy": 0,
            "callsheet.contact.status": 0,
            "callsheet.contact.workflowState": 0,
            "callsheet.createdBy.workflowState": 0,
            "callsheet.createdBy.password": 0,
            "callsheet.createdBy.username": 0,
            "callsheet.createdBy.status": 0,
            "callsheet.createdBy.createdAt": 0,
            "callsheet.createdBy.updatedAt": 0,
            "callsheet.customerGroup.updatedAt": 0,
            "callsheet.customerGroup.createdAt": 0,
            "callsheet.customerGroup.parent": 0,
            "callsheet.customerGroup.branch": 0,
            "callsheet.customerGroup.createdBy": 0,
            "callsheet.customerGroup.status": 0,
            "callsheet.customerGroup.workflowState": 0,
            "callsheet.branch.createdBy": 0,
            "callsheet.branch.status": 0,
            "callsheet.branch.workflowState": 0,
            "callsheet.branch.createdAt": 0,
            "callsheet.branch.updatedAt": 0,
            "tags.createdBy": 0,
            "tags.createdAt": 0,
            "tags.updatedAt": 0,
            "callsheet.schedulelist.customer": 0,
            "callsheet.schedulelist.status": 0,
            "callsheet.schedulelist.createdBy": 0,
            "callsheet.schedulelist.createdAt": 0,
            "callsheet.schedulelist.updatedAt": 0,
            "callsheet.schedulelist.__v": 0,
          },
        },
      ];

      //Menambahkan limit ketika terdapat limit
      if (limit > 0) {
        pipeline.splice(3, 0, { $limit: limit });
      }
      // End

      // Mencari data id callsheet
      const callsheetFilter = filters
        .filter((item: any) => {
          const key = item[0]; // Ambil kunci pada indeks 0
          return key.startsWith("callsheet."); // Kembalikan true jika kunci diawali dengan "schedule."
        })
        .map((item: any) => {
          const key = item[0];
          const value = item[2];
          return [key.replace("callsheet.", ""), item[1], value]; // Hapus "schedule." dari kunci
        });

      const stateCallsheet = stateFilter
        .filter((item) => item.name.startsWith("callsheet.")) // Filter objek yang terkait dengan "schedule"
        .map((item) => {
          const newItem = { ...item }; // Salin objek menggunakan spread operator
          newItem.name = newItem.name.replace("callsheet.", ""); // Hapus "schedule." dari properti nama pada salinan objek
          return newItem;
        });

      if (callsheetFilter.length > 0 || req.query.search) {
        let search: ISearch = {
          filter: ["name"],
          value: req.query.search || "",
        };
        const validCustomer = FilterQuery.getFilter(
          callsheetFilter,
          stateCallsheet,
          search,
          ["_id", "customer", "createdBy", "customer.branch"]
        );

        console.log(JSON.stringify(validCustomer));

        const callsheetData = await CallsheetModel.find(validCustomer.data, [
          "_id",
        ]);

        if (callsheetData.length > 0) {
          const finalFilterCustomer = callsheetData.map((item) => {
            return new ObjectId(item._id);
          });

          pipeline.unshift({
            $match: {
              callsheet: { $in: finalFilterCustomer },
            },
          });

          // pipelineTotal.unshift({
          //   customer: { $in: finalFilterCustomer },
          // });
        } else {
          return res.status(400).json({
            status: 404,
            msg: "Data Not found!",
          });
        }
      }
      //End

      const getAll: any = await Db.find(isFilter.data).count();

      const result = await Db.aggregate(pipeline);

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
    if (!req.body.title) {
      return res
        .status(400)
        .json({ status: 400, msg: "Error, title wajib diisi!" });
    }

    if (!req.body.notes) {
      return res
        .status(400)
        .json({ status: 400, msg: "Error, notes wajib diisi!" });
    }

    try {
      // Cek callsheet
      if (!req.body.callsheetId) {
        return res
          .status(400)
          .json({ status: 400, msg: "Error, callsheetId wajib diisi!" });
      }

      const callsheet = await CallsheetModel.findById(req.body.callsheetId);

      if (!callsheet) {
        return res
          .status(400)
          .json({ status: 400, msg: "Error, callsheet tidak ditemukan!" });
      }

      if (callsheet.status !== "0") {
        return res
          .status(400)
          .json({ status: 400, msg: "Error, callsheet bukan draft!" });
      }

      req.body.callsheet = callsheet._id;
      // End

      // Cek duplikasi data

      // const cekDup = await Db.findOne({
      //   $and: [
      //     { callsheet: new ObjectId(req.body.callsheetId) },
      //     { title: req.body.title },
      //   ],
      // });

      // if (cekDup) {
      //   return res.status(400).json({
      //     status: 400,
      //     msg: `Error, title ${req.body.title}! sudah digunakan di ${callsheet.name} sebelumnya!`,
      //   });
      // }

      // End

      // Cek tag
      if (!req.body.tags) {
        return res
          .status(400)
          .json({ status: 400, msg: "Error, tags wajib diisi!" });
      }

      if (typeof req.body.tags !== "object") {
        return res
          .status(400)
          .json({ status: 400, msg: "Error, tags harus berupa object!" });
      }

      if (req.body.tags.length === 0) {
        return res
          .status(400)
          .json({ status: 400, msg: "Error, tags harus diisi minimal 1 tag!" });
      }

      for (const item of req.body.tags) {
        let getTag: any = await TagModel.findById(new ObjectId(item));
        if (!getTag) {
          return res.status(400).json({
            status: 400,
            msg: `Error, tag ${item} tidak ditemukan!`,
          });
        }
      }

      // End

      req.body.createdBy = req.userId;

      for (let index = 0; index < 4000000; index++) {
        const result = new Db(req.body);
        const response: any = await result.save();
      }

      // const getData = await response.populate("callsheet", "name");

      // // push history
      // await HistoryController.pushHistory({
      //   document: {
      //     _id: getData._id,
      //     name: getData.title,
      //     type: redisName,
      //   },
      //   message: `${req.user} menambahkan callsheetnote ${getData.title} dalam dok ${getData.callsheet.name} `,
      //   user: req.userId,
      // });
      // // End

      return res.status(200).json({ status: 200, data: "d" });
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

        return res.status(200).json({
          status: 200,
          data: JSON.parse(cache),
          history: getHistory,
        });
      }

      const getData: any = await Db.aggregate([
        {
          $match: {
            _id: new ObjectId(req.params.id),
          },
        },
        {
          $lookup: {
            from: "callsheets",
            localField: "callsheet",
            foreignField: "_id",
            as: "callsheet",
          },
        },
        {
          $unwind: "$callsheet",
        },
        {
          $lookup: {
            from: "customers",
            localField: "callsheet.customer",
            foreignField: "_id",
            as: "callsheet.customer",
          },
        },
        {
          $unwind: "$callsheet.customer",
        },
        {
          $lookup: {
            from: "contacts",
            localField: "callsheet.contact",
            foreignField: "_id",
            as: "callsheet.contact",
          },
        },
        {
          $unwind: "$callsheet.contact",
        },
        {
          $lookup: {
            from: "users",
            localField: "callsheet.createdBy",
            foreignField: "_id",
            as: "callsheet.createdBy",
          },
        },
        {
          $unwind: "$callsheet.createdBy",
        },
        {
          $lookup: {
            from: "customergroups",
            localField: "callsheet.customer.customerGroup",
            foreignField: "_id",
            as: "callsheet.customerGroup",
          },
        },
        {
          $unwind: "$callsheet.customerGroup",
        },
        {
          $lookup: {
            from: "branches",
            localField: "callsheet.customer.branch",
            foreignField: "_id",
            as: "callsheet.branch",
          },
        },
        {
          $unwind: "$callsheet.branch",
        },
        {
          $lookup: {
            from: "tags",
            localField: "tags",
            foreignField: "_id",
            as: "tags",
          },
        },

        {
          $lookup: {
            from: "schedulelists",
            localField: "callsheet.schedulelist",
            foreignField: "_id",
            as: "callsheet.schedulelist",
            pipeline: [
              {
                $lookup: {
                  from: "schedules",
                  localField: "schedule",
                  foreignField: "_id",
                  as: "schedule",
                },
              },
              {
                $unwind: "$schedule",
              },
              {
                $project: {
                  "schedule._id": 1,
                  "schedule.name": 1,
                  "schedule.closingDate": 1,
                },
              },
            ],
          },
        },

        {
          $project: {
            "callsheet.customer.customerGroup": 0,
            "callsheet.customer.branch": 0,
            "callsheet.customer.status": 0,
            "callsheet.customer.workflowState": 0,
            "callsheet.customer.createdAt": 0,
            "callsheet.customer.updatedAt": 0,
            "callsheet.contact.createdAt": 0,
            "callsheet.contact.updatedAt": 0,
            "callsheet.contact.customer": 0,
            "callsheet.contact.createdBy": 0,
            "callsheet.contact.status": 0,
            "callsheet.contact.workflowState": 0,
            "callsheet.createdBy.workflowState": 0,
            "callsheet.createdBy.password": 0,
            "callsheet.createdBy.username": 0,
            "callsheet.createdBy.status": 0,
            "callsheet.createdBy.createdAt": 0,
            "callsheet.createdBy.updatedAt": 0,
            "callsheet.customerGroup.updatedAt": 0,
            "callsheet.customerGroup.createdAt": 0,
            "callsheet.customerGroup.parent": 0,
            "callsheet.customerGroup.branch": 0,
            "callsheet.customerGroup.createdBy": 0,
            "callsheet.customerGroup.status": 0,
            "callsheet.customerGroup.workflowState": 0,
            "callsheet.branch.createdBy": 0,
            "callsheet.branch.status": 0,
            "callsheet.branch.workflowState": 0,
            "callsheet.branch.createdAt": 0,
            "callsheet.branch.updatedAt": 0,
            "tags.createdBy": 0,
            "tags.createdAt": 0,
            "tags.updatedAt": 0,
            "callsheet.schedulelist.customer": 0,
            "callsheet.schedulelist.status": 0,
            "callsheet.schedulelist.createdBy": 0,
            "callsheet.schedulelist.createdAt": 0,
            "callsheet.schedulelist.updatedAt": 0,
            "callsheet.schedulelist.__v": 0,
          },
        },
      ]);

      if (getData.length === 0) {
        return res
          .status(404)
          .json({ status: 404, msg: "Error, Data tidak ditemukan!" });
      }

      const result = getData[0];

      if (!result) {
        return res
          .status(404)
          .json({ status: 404, msg: "Error, Data tidak ditemukan!" });
      }

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
      });
    } catch (error) {
      return res.status(404).json({ status: 404, data: error });
    }
  };

  update = async (req: Request | any, res: Response): Promise<Response> => {
    try {
      const result: any = await Db.findOne({
        _id: req.params.id,
      })
        .populate("callsheet", "name")
        .populate("tags", "name");

      if (result) {
        // Cek callsheet

        if (req.body.callsheetId) {
          const callsheet = await CallsheetModel.findById(req.body.callsheetId);

          if (!callsheet) {
            return res
              .status(400)
              .json({ status: 400, msg: "Error, callsheet tidak ditemukan!" });
          }

          if (callsheet.status !== "0") {
            return res
              .status(400)
              .json({ status: 400, msg: "Error, callsheet bukan draft!" });
          }

          req.body.callsheet = callsheet._id;
        }
        // End

        // Cek duplikasi data
        if (req.body.title || req.body.callsheetId) {
          const cekDup = await Db.findOne({
            $and: [
              {
                callsheet: req.body.callsheetId
                  ? new ObjectId(req.body.callsheetId)
                  : result.callsheet,
              },
              { title: req.body.title ? req.body.title : result.title },
              {
                _id: { $ne: req.params.id },
              },
            ],
          });

          if (cekDup) {
            return res.status(400).json({
              status: 400,
              msg: `Error, title ${
                req.body.title ? req.body.title : result.title
              }! sudah digunakan di customer ini sebelumnya!`,
            });
          }
        }
        // End

        // Cek tag

        if (req.body.tags) {
          if (typeof req.body.tags !== "object") {
            return res
              .status(400)
              .json({ status: 400, msg: "Error, tags harus berupa object!" });
          }

          if (req.body.tags.length === 0) {
            return res.status(400).json({
              status: 400,
              msg: "Error, tags harus diisi minimal 1 tag!",
            });
          }

          for (const item of req.body.tags) {
            let getTag: any = await TagModel.findById(new ObjectId(item));
            if (!getTag) {
              return res.status(400).json({
                status: 400,
                msg: `Error, tag ${item} tidak ditemukan!`,
              });
            }
          }
        }

        // End

        await Db.updateOne({ _id: req.params.id }, req.body);

        const getData: any = await Db.findOne({
          _id: req.params.id,
        })
          .populate("callsheet", "name")
          .populate("tags", "name");

        // push history semua field yang di update
        await HistoryController.pushUpdateMany(
          result,
          getData,
          req.user,
          req.userId,
          redisName
        );
        // End

        const resultUpdate: any = await Db.aggregate([
          {
            $match: {
              _id: new ObjectId(req.params.id),
            },
          },
          {
            $lookup: {
              from: "callsheets",
              localField: "callsheet",
              foreignField: "_id",
              as: "callsheet",
            },
          },
          {
            $unwind: "$callsheet",
          },
          {
            $lookup: {
              from: "customers",
              localField: "callsheet.customer",
              foreignField: "_id",
              as: "callsheet.customer",
            },
          },
          {
            $unwind: "$callsheet.customer",
          },
          {
            $lookup: {
              from: "contacts",
              localField: "callsheet.contact",
              foreignField: "_id",
              as: "callsheet.contact",
            },
          },
          {
            $unwind: "$callsheet.contact",
          },
          {
            $lookup: {
              from: "users",
              localField: "callsheet.createdBy",
              foreignField: "_id",
              as: "callsheet.createdBy",
            },
          },
          {
            $unwind: "$callsheet.createdBy",
          },
          {
            $lookup: {
              from: "customergroups",
              localField: "callsheet.customer.customerGroup",
              foreignField: "_id",
              as: "callsheet.customerGroup",
            },
          },
          {
            $unwind: "$callsheet.customerGroup",
          },
          {
            $lookup: {
              from: "branches",
              localField: "callsheet.customer.branch",
              foreignField: "_id",
              as: "callsheet.branch",
            },
          },
          {
            $unwind: "$callsheet.branch",
          },
          {
            $lookup: {
              from: "tags",
              localField: "tags",
              foreignField: "_id",
              as: "tags",
            },
          },

          {
            $lookup: {
              from: "schedulelists",
              localField: "callsheet.schedulelist",
              foreignField: "_id",
              as: "callsheet.schedulelist",
              pipeline: [
                {
                  $lookup: {
                    from: "schedules",
                    localField: "schedule",
                    foreignField: "_id",
                    as: "schedule",
                  },
                },
                {
                  $unwind: "$schedule",
                },
                {
                  $project: {
                    "schedule._id": 1,
                    "schedule.name": 1,
                    "schedule.closingDate": 1,
                  },
                },
              ],
            },
          },

          {
            $project: {
              "callsheet.customer.customerGroup": 0,
              "callsheet.customer.branch": 0,
              "callsheet.customer.status": 0,
              "callsheet.customer.workflowState": 0,
              "callsheet.customer.createdAt": 0,
              "callsheet.customer.updatedAt": 0,
              "callsheet.contact.createdAt": 0,
              "callsheet.contact.updatedAt": 0,
              "callsheet.contact.customer": 0,
              "callsheet.contact.createdBy": 0,
              "callsheet.contact.status": 0,
              "callsheet.contact.workflowState": 0,
              "callsheet.createdBy.workflowState": 0,
              "callsheet.createdBy.password": 0,
              "callsheet.createdBy.username": 0,
              "callsheet.createdBy.status": 0,
              "callsheet.createdBy.createdAt": 0,
              "callsheet.createdBy.updatedAt": 0,
              "callsheet.customerGroup.updatedAt": 0,
              "callsheet.customerGroup.createdAt": 0,
              "callsheet.customerGroup.parent": 0,
              "callsheet.customerGroup.branch": 0,
              "callsheet.customerGroup.createdBy": 0,
              "callsheet.customerGroup.status": 0,
              "callsheet.customerGroup.workflowState": 0,
              "callsheet.branch.createdBy": 0,
              "callsheet.branch.status": 0,
              "callsheet.branch.workflowState": 0,
              "callsheet.branch.createdAt": 0,
              "callsheet.branch.updatedAt": 0,
              "tags.createdBy": 0,
              "tags.createdAt": 0,
              "tags.updatedAt": 0,
              "callsheet.schedulelist.customer": 0,
              "callsheet.schedulelist.status": 0,
              "callsheet.schedulelist.createdBy": 0,
              "callsheet.schedulelist.createdAt": 0,
              "callsheet.schedulelist.updatedAt": 0,
              "callsheet.schedulelist.__v": 0,
            },
          },
        ]);

        await Redis.client.set(
          `${redisName}-${req.params.id}`,
          JSON.stringify(resultUpdate[0]),
          {
            EX: 30,
          }
        );

        return res.status(200).json({ status: 200, data: resultUpdate[0] });
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

  delete = async (req: Request, res: Response): Promise<Response> => {
    try {
      const getData: any = await Db.findOne({ _id: req.params.id });

      if (!getData) {
        return res
          .status(404)
          .json({ status: 404, msg: "Error, Data tidak ditemukan!" });
      }

      const result = await Db.deleteOne({ _id: req.params.id });
      await Redis.client.del(`${redisName}-${req.params.id}`);
      return res.status(200).json({ status: 200, data: result });
    } catch (error) {
      return res.status(404).json({ status: 404, msg: error });
    }
  };
}

export default new CallsheetNoteController();

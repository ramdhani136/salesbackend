import { Request, Response } from "express";
import Redis from "../config/Redis";
import { IStateFilter } from "../Interfaces";
import { FilterQuery } from "../utils";
import IController from "./ControllerInterface";
import { TypeOfState } from "../Interfaces/FilterInterface";
import {
  VisitNoteModel as Db,
  History,
  visitModel,
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

const redisName = "visitnote";

class VisitNoteController implements IController {
  index = async (req: Request | any, res: Response): Promise<Response> => {
    const stateFilter: IStateFilter[] = [
      {
        alias: "Id",
        name: "_id",
        operator: ["=", "!="],
        typeOf: TypeOfState.String,
      },

      {
        alias: "Title",
        name: "title",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
        isSort: true,
      },
      {
        alias: "Visit",
        name: "visit",
        operator: ["=", "!="],
        typeOf: TypeOfState.String,
      },
      {
        alias: "Notes",
        name: "notes",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
        isSort: true,
      },

      {
        alias: "Tags",
        name: "tags",
        operator: ["=", "!="],
        typeOf: TypeOfState.String,
        isSort: true,
      },
      {
        alias: "VisitType",
        name: "visit.type",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
      },
      {
        alias: "Rate",
        name: "visit.rate",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
      },
      {
        alias: "Status",
        name: "visit.status",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
      },
      {
        alias: "Customer",
        name: "visit.customer",
        operator: ["=", "!="],
        typeOf: TypeOfState.String,
      },
      {
        alias: "CreatedBy",
        name: "visit.createdBy",
        operator: ["=", "!="],
        typeOf: TypeOfState.String,
      },
      {
        alias: "VisitCreatedAt",
        name: "visit.createdAt",
        operator: ["=", "!=", "like", "notlike", ">", "<", ">=", "<="],
        typeOf: TypeOfState.Date,
      },
      {
        alias: "VisitUpdatedAt",
        name: "visit.updatedAt",
        operator: ["=", "!=", "like", "notlike", ">", "<", ">=", "<="],
        typeOf: TypeOfState.Date,
      },
      {
        alias: "CheckInAt",
        name: "visit.checkIn.createdAt",
        operator: ["=", "!=", "like", "notlike", ">", "<", ">=", "<="],
        typeOf: TypeOfState.Date,
      },
      {
        alias: "CheckOutAt",
        name: "visit.checkOut.createdAt",
        operator: ["=", "!=", "like", "notlike", ">", "<", ">=", "<="],
        typeOf: TypeOfState.Date,
      },

      {
        alias: "CustomerGroup",
        name: "customer.customerGroup",
        operator: ["=", "!="],
        typeOf: TypeOfState.String,
      },
      {
        alias: "CustomerType",
        name: "customer.type",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
      },
      // {
      //   name: "customer.name",
      //   operator: ["=", "!=", "like", "notlike"],
      //   typeOf: TypeOfState.String,
      // },
      {
        alias: "Branch",
        name: "customer.branch",
        operator: ["=", "!="],
        typeOf: TypeOfState.String,
      },
      {
        alias: "CreatedAt",
        name: "createdAt",
        operator: ["=", "!=", "like", "notlike", ">", "<", ">=", "<="],
        typeOf: TypeOfState.Date,
        isSort: true,
      },
      {
        alias: "UpdatedAt",
        name: "updatedAt",
        operator: ["=", "!=", "like", "notlike", ">", "<", ">=", "<="],
        typeOf: TypeOfState.Date,
        isSort: true,
      },
    ];
    try {
      const filters: any = req.query.filters
        ? JSON.parse(`${req.query.filters}`)
        : [];
      // const fields: any = req.query.fields
      //   ? JSON.parse(`${req.query.fields}`)
      //   : ["_id", "title", "visit._id"];
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

      const notDefault: any = filters.filter((item: any) => {
        const key = item[0]; // Ambil kunci pada indeks 0
        return !key.startsWith("visit.") && !key.startsWith("customer."); // Kembalikan true jika kunci diawali dengan "schedule."
      });

      let isFilter = FilterQuery.getFilter(notDefault, stateFilter, search, [
        "_id",
        "tags",
        "visit",
      ]);

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
        { $match: isFilter.data },
        {
          $sort: order_by,
        },
        {
          $skip: limit > 0 ? page * limit - limit : 0,
        },
        {
          $lookup: {
            from: "visits",
            localField: "visit",
            foreignField: "_id",
            as: "visit",
          },
        },
        {
          $unwind: "$visit",
        },
        {
          $lookup: {
            from: "customers",
            localField: "visit.customer",
            foreignField: "_id",
            as: "visit.customer",
          },
        },
        {
          $unwind: "$visit.customer",
        },
        {
          $lookup: {
            from: "contacts",
            localField: "visit.contact",
            foreignField: "_id",
            as: "visit.contact",
          },
        },
        {
          $unwind: "$visit.contact",
        },
        {
          $lookup: {
            from: "users",
            localField: "visit.createdBy",
            foreignField: "_id",
            as: "visit.createdBy",
          },
        },
        {
          $unwind: "$visit.createdBy",
        },
        {
          $lookup: {
            from: "customergroups",
            localField: "visit.customer.customerGroup",
            foreignField: "_id",
            as: "visit.customerGroup",
          },
        },
        {
          $unwind: "$visit.customerGroup",
        },
        {
          $lookup: {
            from: "branches",
            localField: "visit.customer.branch",
            foreignField: "_id",
            as: "visit.branch",
          },
        },
        {
          $unwind: "$visit.branch",
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
            localField: "visit.schedulelist",
            foreignField: "_id",
            as: "visit.schedulelist",
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
            "visit.customer.customerGroup": 0,
            "visit.customer.branch": 0,
            "visit.customer.status": 0,
            "visit.customer.workflowState": 0,
            "visit.customer.createdAt": 0,
            "visit.customer.updatedAt": 0,
            "visit.contact.createdAt": 0,
            "visit.contact.updatedAt": 0,
            "visit.contact.customer": 0,
            "visit.contact.createdBy": 0,
            "visit.contact.status": 0,
            "visit.contact.workflowState": 0,
            "visit.createdBy.workflowState": 0,
            "visit.createdBy.password": 0,
            "visit.createdBy.username": 0,
            "visit.createdBy.status": 0,
            "visit.createdBy.createdAt": 0,
            "visit.createdBy.updatedAt": 0,
            "visit.customerGroup.updatedAt": 0,
            "visit.customerGroup.createdAt": 0,
            "visit.customerGroup.parent": 0,
            "visit.customerGroup.branch": 0,
            "visit.customerGroup.createdBy": 0,
            "visit.customerGroup.status": 0,
            "visit.customerGroup.workflowState": 0,
            "visit.branch.createdBy": 0,
            "visit.branch.status": 0,
            "visit.branch.workflowState": 0,
            "visit.branch.createdAt": 0,
            "visit.branch.updatedAt": 0,
            "tags.createdBy": 0,
            "tags.createdAt": 0,
            "tags.updatedAt": 0,
            "visit.schedulelist.customer": 0,
            "visit.schedulelist.status": 0,
            "visit.schedulelist.createdBy": 0,
            "visit.schedulelist.createdAt": 0,
            "visit.schedulelist.updatedAt": 0,
            "visit.schedulelist.__v": 0,
          },
        },
      ];

      //Menambahkan limit ketika terdapat limit
      if (limit > 0) {
        pipeline.splice(3, 0, { $limit: limit });
      }
      // End

      let pipelineTotal: any[] = [isFilter.data];

      // Mencari data id customer
      const customerFIlter = filters
        .filter((item: any) => {
          const key = item[0]; // Ambil kunci pada indeks 0
          return key.startsWith("customer."); // Kembalikan true jika kunci diawali dengan "schedule."
        })
        .map((item: any) => {
          const key = item[0];
          const value = item[2];
          return [key.replace("customer.", ""), item[1], value]; // Hapus "schedule." dari kunci
        });

      const stateCustomer = stateFilter
        .filter((item) => item.name.startsWith("customer.")) // Filter objek yang terkait dengan "schedule"
        .map((item) => {
          const newItem = { ...item }; // Salin objek menggunakan spread operator
          newItem.name = newItem.name.replace("customer.", ""); // Hapus "schedule." dari properti nama pada salinan objek
          return newItem;
        });

      // Mencari data id visit
      const visitFilter = filters
        .filter((item: any) => {
          const key = item[0]; // Ambil kunci pada indeks 0
          return key.startsWith("visit."); // Kembalikan true jika kunci diawali dengan "schedule."
        })
        .map((item: any) => {
          const key = item[0];
          const value = item[2];
          return [key.replace("visit.", ""), item[1], value]; // Hapus "schedule." dari kunci
        });

      const stateVisit = stateFilter
        .filter((item) => item.name.startsWith("visit.")) // Filter objek yang terkait dengan "schedule"
        .map((item) => {
          const newItem = { ...item }; // Salin objek menggunakan spread operator
          newItem.name = newItem.name.replace("visit.", ""); // Hapus "schedule." dari properti nama pada salinan objek
          return newItem;
        });

      if (
        visitFilter.length > 0 ||
        req.query.search ||
        customerFIlter.length > 0
      ) {
        // Cek Customer

        let searchCust: ISearch = {
          filter: ["name"],
          value: req.query.search || "",
        };
        const validCustomer = FilterQuery.getFilter(
          customerFIlter,
          stateCustomer,
          searchCust,
          ["_id", "customerGroup", "branch"]
        );

        const customerData = await CustomerModel.find(validCustomer.data, [
          "_id",
        ]);

        let finalFilterCustomer: any[] = [];
        if (customerData.length > 0) {
          finalFilterCustomer = customerData.map((item) => {
            return item._id;
          });
        } else {
          return res.status(400).json({
            status: 404,
            msg: "Data Not found!",
          });
        }

        // End

        const validVisit = FilterQuery.getFilter(
          visitFilter,
          stateVisit,
          undefined,
          ["_id", "customer", "createdBy", "customer.branch"]
        );

        let pipelineVisit: any[] = [validVisit.data];

        if (finalFilterCustomer.length > 0) {
          pipelineVisit.push({ customer: { $in: finalFilterCustomer } });
        }

        const visitData = await visitModel.find({ $and: pipelineVisit }, [
          "_id",
        ]);

        if (visitData.length > 0) {
          const finalFilterVisit = visitData.map((item) => {
            return new ObjectId(item._id);
          });

          pipeline.unshift({
            $match: {
              visit: { $in: finalFilterVisit },
            },
          });

          pipelineTotal.push({
            visit: { $in: finalFilterVisit },
          });
        } else {
          return res.status(400).json({
            status: 404,
            msg: "Data Not found!",
          });
        }
      }
      //End

      const getAll: any = await Db.find(
        { $and: pipelineTotal },
        { _id: 1 }
      ).count();

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
      // Cek visit
      if (!req.body.visitId) {
        return res
          .status(400)
          .json({ status: 400, msg: "Error, visitId wajib diisi!" });
      }

      const visit = await visitModel.findById(req.body.visitId);

      if (!visit) {
        return res
          .status(400)
          .json({ status: 400, msg: "Error, visit tidak ditemukan!" });
      }

      if (visit.status !== "0") {
        return res
          .status(400)
          .json({ status: 400, msg: "Error, visit bukan draft!" });
      }

      req.body.visit = visit._id;
      // End

      // Cek duplikasi data

      // const cekDup = await Db.findOne({
      //   $and: [
      //     { visit: new ObjectId(req.body.visitId) },
      //     { title: req.body.title },
      //   ],
      // });

      // if (cekDup) {
      //   return res.status(400).json({
      //     status: 400,
      //     msg: `Error, title ${req.body.title}! sudah digunakan di ${visit.name} sebelumnya!`,
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

      const result = new Db(req.body);
      const response: any = await result.save();

      const getData = await response.populate("visit", "name");

      // push history
      await HistoryController.pushHistory({
        document: {
          _id: getData._id,
          name: getData.title,
          type: redisName,
        },
        message: `${req.user} menambahkan visitNote ${getData.title} dalam dok ${getData.visit.name} `,
        user: req.userId,
      });
      // End

      return res.status(200).json({ status: 200, data: getData });
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
            from: "visits",
            localField: "visit",
            foreignField: "_id",
            as: "visit",
          },
        },
        {
          $unwind: "$visit",
        },
        {
          $lookup: {
            from: "customers",
            localField: "visit.customer",
            foreignField: "_id",
            as: "visit.customer",
          },
        },
        {
          $unwind: "$visit.customer",
        },
        {
          $lookup: {
            from: "contacts",
            localField: "visit.contact",
            foreignField: "_id",
            as: "visit.contact",
          },
        },
        {
          $unwind: "$visit.contact",
        },
        {
          $lookup: {
            from: "users",
            localField: "visit.createdBy",
            foreignField: "_id",
            as: "visit.createdBy",
          },
        },
        {
          $unwind: "$visit.createdBy",
        },
        {
          $lookup: {
            from: "customergroups",
            localField: "visit.customer.customerGroup",
            foreignField: "_id",
            as: "visit.customerGroup",
          },
        },
        {
          $unwind: "$visit.customerGroup",
        },
        {
          $lookup: {
            from: "branches",
            localField: "visit.customer.branch",
            foreignField: "_id",
            as: "visit.branch",
          },
        },
        {
          $unwind: "$visit.branch",
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
            localField: "visit.schedulelist",
            foreignField: "_id",
            as: "visit.schedulelist",
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
            "visit.customer.customerGroup": 0,
            "visit.customer.branch": 0,
            "visit.customer.status": 0,
            "visit.customer.workflowState": 0,
            "visit.customer.createdAt": 0,
            "visit.customer.updatedAt": 0,
            "visit.contact.createdAt": 0,
            "visit.contact.updatedAt": 0,
            "visit.contact.customer": 0,
            "visit.contact.createdBy": 0,
            "visit.contact.status": 0,
            "visit.contact.workflowState": 0,
            "visit.createdBy.workflowState": 0,
            "visit.createdBy.password": 0,
            "visit.createdBy.username": 0,
            "visit.createdBy.status": 0,
            "visit.createdBy.createdAt": 0,
            "visit.createdBy.updatedAt": 0,
            "visit.customerGroup.updatedAt": 0,
            "visit.customerGroup.createdAt": 0,
            "visit.customerGroup.parent": 0,
            "visit.customerGroup.branch": 0,
            "visit.customerGroup.createdBy": 0,
            "visit.customerGroup.status": 0,
            "visit.customerGroup.workflowState": 0,
            "visit.branch.createdBy": 0,
            "visit.branch.status": 0,
            "visit.branch.workflowState": 0,
            "visit.branch.createdAt": 0,
            "visit.branch.updatedAt": 0,
            "tags.createdBy": 0,
            "tags.createdAt": 0,
            "tags.updatedAt": 0,
            "visit.schedulelist.customer": 0,
            "visit.schedulelist.status": 0,
            "visit.schedulelist.createdBy": 0,
            "visit.schedulelist.createdAt": 0,
            "visit.schedulelist.updatedAt": 0,
            "visit.schedulelist.__v": 0,
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
    if (req.body.visit) {
      return res.status(400).json({
        status: 400,
        msg: "Error, tidak dapat merubah visit!",
      });
    }

    try {
      const result: any = await Db.findOne({
        _id: req.params.id,
      })
        .populate("visit", "name")
        .populate("tags", "name");

      if (result) {
        // Cek visit

        if (req.body.visitId) {
          const visit = await visitModel.findById(req.body.visitId);

          if (!visit) {
            return res
              .status(400)
              .json({ status: 400, msg: "Error, visit tidak ditemukan!" });
          }

          if (visit.status !== "0") {
            return res
              .status(400)
              .json({ status: 400, msg: "Error, visit bukan draft!" });
          }

          req.body.visit = visit._id;
        }
        // End

        // Cek duplikasi data
        if (req.body.title || req.body.visitId) {
          const cekDup = await Db.findOne({
            $and: [
              {
                visit: req.body.visitId
                  ? new ObjectId(req.body.visitId)
                  : result.visit,
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
          .populate("visit", "name")
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
              from: "visits",
              localField: "visit",
              foreignField: "_id",
              as: "visit",
            },
          },
          {
            $unwind: "$visit",
          },
          {
            $lookup: {
              from: "customers",
              localField: "visit.customer",
              foreignField: "_id",
              as: "visit.customer",
            },
          },
          {
            $unwind: "$visit.customer",
          },
          {
            $lookup: {
              from: "contacts",
              localField: "visit.contact",
              foreignField: "_id",
              as: "visit.contact",
            },
          },
          {
            $unwind: "$visit.contact",
          },
          {
            $lookup: {
              from: "users",
              localField: "visit.createdBy",
              foreignField: "_id",
              as: "visit.createdBy",
            },
          },
          {
            $unwind: "$visit.createdBy",
          },
          {
            $lookup: {
              from: "customergroups",
              localField: "visit.customer.customerGroup",
              foreignField: "_id",
              as: "visit.customerGroup",
            },
          },
          {
            $unwind: "$visit.customerGroup",
          },
          {
            $lookup: {
              from: "branches",
              localField: "visit.customer.branch",
              foreignField: "_id",
              as: "visit.branch",
            },
          },
          {
            $unwind: "$visit.branch",
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
              localField: "visit.schedulelist",
              foreignField: "_id",
              as: "visit.schedulelist",
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
              "visit.customer.customerGroup": 0,
              "visit.customer.branch": 0,
              "visit.customer.status": 0,
              "visit.customer.workflowState": 0,
              "visit.customer.createdAt": 0,
              "visit.customer.updatedAt": 0,
              "visit.contact.createdAt": 0,
              "visit.contact.updatedAt": 0,
              "visit.contact.customer": 0,
              "visit.contact.createdBy": 0,
              "visit.contact.status": 0,
              "visit.contact.workflowState": 0,
              "visit.createdBy.workflowState": 0,
              "visit.createdBy.password": 0,
              "visit.createdBy.username": 0,
              "visit.createdBy.status": 0,
              "visit.createdBy.createdAt": 0,
              "visit.createdBy.updatedAt": 0,
              "visit.customerGroup.updatedAt": 0,
              "visit.customerGroup.createdAt": 0,
              "visit.customerGroup.parent": 0,
              "visit.customerGroup.branch": 0,
              "visit.customerGroup.createdBy": 0,
              "visit.customerGroup.status": 0,
              "visit.customerGroup.workflowState": 0,
              "visit.branch.createdBy": 0,
              "visit.branch.status": 0,
              "visit.branch.workflowState": 0,
              "visit.branch.createdAt": 0,
              "visit.branch.updatedAt": 0,
              "tags.createdBy": 0,
              "tags.createdAt": 0,
              "tags.updatedAt": 0,
              "visit.schedulelist.customer": 0,
              "visit.schedulelist.status": 0,
              "visit.schedulelist.createdBy": 0,
              "visit.schedulelist.createdAt": 0,
              "visit.schedulelist.updatedAt": 0,
              "visit.schedulelist.__v": 0,
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

export default new VisitNoteController();

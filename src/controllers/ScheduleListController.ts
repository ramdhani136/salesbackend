import { NextFunction, Request, Response } from "express";
import Redis from "../config/Redis";
import { IStateFilter } from "../Interfaces";
import { FilterQuery } from "../utils";
import IController from "./ControllerInterface";
import { TypeOfState } from "../Interfaces/FilterInterface";
import {
  CustomerGroupModel,
  CustomerModel,
  ScheduleListModel as Db,
  History,
  ScheduleModel,
  visitModel,
} from "../models";

import { ObjectId } from "mongodb";
import HistoryController from "./HistoryController";
import WorkflowController from "./WorkflowController";
import { ISearch } from "../utils/FilterQuery";

const redisName = "schedulelist";

class ScheduleListController implements IController {
  index = async (req: Request | any, res: Response): Promise<Response> => {
    const stateFilter: IStateFilter[] = [
      {
        name: "_id",
        operator: ["=", "!="],
        typeOf: TypeOfState.String,
      },
      {
        name: "schedule._id",
        operator: ["=", "!="],
        typeOf: TypeOfState.String,
      },
      {
        name: "schedule.name",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
      },
      {
        name: "name",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
      },
      {
        name: "schedule.type",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
      },
      {
        name: "schedule.status",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
      },
      {
        name: "schedule.workflowState",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
      },
      {
        name: "schedule.activeDate",
        operator: ["=", "!=", "like", "notlike", ">", "<", ">=", "<="],
        typeOf: TypeOfState.Date,
      },
      {
        name: "schedule.closingDate",
        operator: ["=", "!=", "like", "notlike", ">", "<", ">=", "<="],
        typeOf: TypeOfState.Date,
      },
      {
        name: "schedule.createdAt",
        operator: ["=", "!=", "like", "notlike", ">", "<", ">=", "<="],
        typeOf: TypeOfState.Date,
      },
      {
        name: "schedule.userGroup",
        operator: ["=", "!="],
        typeOf: TypeOfState.String,
      },
      {
        name: "customer._id",
        operator: ["=", "!="],
        typeOf: TypeOfState.String,
      },
      {
        name: "customer.name",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
      },

      {
        name: "status",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
      },

      {
        name: "customerGroup._id",
        operator: ["=", "!="],
        typeOf: TypeOfState.String,
      },
      {
        name: "customerGroup.name",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
      },
      {
        name: "branch._id",
        operator: ["=", "!="],
        typeOf: TypeOfState.String,
      },
      {
        name: "branch.name",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
      },
      {
        name: "createdBy",
        operator: ["=", "!="],
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

      // Mencari data id schedule
      const scheduleFIlter = filters
        .filter((item: any) => {
          const key = item[0]; // Ambil kunci pada indeks 0
          return key.startsWith("schedule."); // Kembalikan true jika kunci diawali dengan "schedule."
        })
        .map((item: any) => {
          const key = item[0];
          const value = item[2];
          return [key.replace("schedule.", ""), item[1], value]; // Hapus "schedule." dari kunci
        });

      const stateSchedule = stateFilter
        .filter((item) => item.name.startsWith("schedule.")) // Filter objek yang terkait dengan "schedule"
        .map((item) => {
          const newItem = { ...item }; // Salin objek menggunakan spread operator
          newItem.name = newItem.name.replace("schedule.", ""); // Hapus "schedule." dari properti nama pada salinan objek
          return newItem;
        });

      if (scheduleFIlter.length > 0 || req.query.search) {
        let search: ISearch = {
          filter: ["name"],
          value: req.query.search || "",
        };
        const validScheduleFIlter = FilterQuery.getFilter(
          scheduleFIlter,
          stateSchedule,
          search,
          ["_id", "userGroup"]
        );

        const schedulesData = await ScheduleModel.find(
          validScheduleFIlter.data,
          ["_id"]
        );

        console.log(schedulesData);
      }

      // End

      const fields: any = req.query.fields
        ? JSON.parse(`${req.query.fields}`)
        : [
            "_id",
            "schedule._id",
            "schedule.name",
            "customer._id",
            "customer.name",
            "customerGroup._id",
            "customerGroup.name",
            "branch._id",
            "branch.name",
            "createdBy._id",
            "createdBy.name",
            "userGroup._id",
            "userGroup.name",
            "createdAt",
            "updatedAt",
          ];

      const order_by: any = req.query.order_by
        ? JSON.parse(`${req.query.order_by}`)
        : { updatedAt: -1 };
      const limit: number | string = parseInt(`${req.query.limit}`) || 0;
      let page: number | string = parseInt(`${req.query.page}`) || 1;
      let setField = FilterQuery.getField(fields);

      let isFilter = FilterQuery.getFilter(filters, stateFilter, undefined, [
        "_id",
        "createdBy",
      ]);

      if (!isFilter.status) {
        return res
          .status(400)
          .json({ status: 400, msg: "Error, Filter Invalid " });
      }
      // End

      const getAll = await Db.find(isFilter.data).count();

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
            from: "users",
            localField: "createdBy",
            foreignField: "_id",
            as: "createdBy",
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
          },
        },
        {
          $unwind: "$customer",
        },
        {
          $lookup: {
            from: "customergroups",
            localField: "customerGroup",
            foreignField: "_id",
            as: "customerGroup",
          },
        },
        {
          $unwind: "$customerGroup",
        },
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
          $lookup: {
            from: "usergroups",
            localField: "schedule.userGroup",
            foreignField: "_id",
            as: "userGroup",
          },
        },
        {
          $unwind: "$userGroup",
        },
      ];

      if (Object.keys(setField).length > 0) {
        pipeline.push({
          $project: setField,
        });
      }
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
    if (req.body.closing) {
      return res
        .status(400)
        .json({ status: 400, msg: "Error, tidak dapat mengisi closing!" });
    }
    if (!req.body.schedule) {
      return res
        .status(400)
        .json({ status: 400, msg: "Error, schedule wajib diisi!" });
    }

    if (typeof req.body.schedule !== "string") {
      return res.status(404).json({
        status: 404,
        msg: "Error, Cek kembali data schedule, Data harus berupa string id schedule!",
      });
    }

    if (!req.body.customer) {
      return res
        .status(400)
        .json({ status: 400, msg: "Error, customer wajib diisi!" });
    }

    if (typeof req.body.customer !== "string") {
      return res.status(404).json({
        status: 404,
        msg: "Error, Cek kembali data customer, Data harus berupa string id customer!",
      });
    }

    try {
      //Mengecek Schedule
      const cekSchedule: any = await ScheduleModel.findOne({
        $and: [{ _id: req.body.schedule }],
      })
        .populate("userGroup", "name")
        .populate("createdBy", "name");

      if (!cekSchedule) {
        return res.status(404).json({
          status: 404,
          msg: "Error, schedule tidak ditemukan!",
        });
      }

      if (cekSchedule.status != 0) {
        return res.status(404).json({
          status: 404,
          msg: "Error, hanya bisa menambah list schedule saat dokumen status draft!",
        });
      }
      // End

      // set setSchedule

      req.body.schedule = cekSchedule._id;

      // End

      // End

      //Mengecek customer
      const cekCustomer: any = await CustomerModel.findOne({
        $and: [{ _id: req.body.customer }],
      })
        .populate("customerGroup", "name")
        .populate("branch", "name");

      if (!cekCustomer) {
        return res.status(404).json({
          status: 404,
          msg: "Error, customer tidak ditemukan!",
        });
      }

      if (cekCustomer.status != 1) {
        return res.status(404).json({
          status: 404,
          msg: "Error, customer tidak aktif!",
        });
      }
      // End

      req.body.customer = cekCustomer._id;
      req.body.customerGroup = cekCustomer.customerGroup._id;
      req.body.branch = cekCustomer.branch._id;

      // End

      // Cek Duplikat data
      const dupl: any = await Db.findOne({
        $and: [
          { schedule: new ObjectId(req.body.schedule) },
          { customer: new ObjectId(req.body.customer) },
        ],
      });

      if (dupl) {
        return res.status(404).json({
          status: 404,
          msg: `Error, customer ${cekCustomer.name} sudah ada di dalam schedule ${cekSchedule.name}!`,
        });
      }

      // End

      req.body.createdBy = req.userId;
      const result = new Db(req.body);
      const response: any = await result.save();

      // push history
      await HistoryController.pushHistory({
        document: {
          _id: response._id,
          name: `schedulelist`,
          type: redisName,
        },
        message: `${req.user} menambahkan customer ${cekCustomer.name} pada schedule  ${cekSchedule.name} `,
        user: req.userId,
      });
      // End

      return res.status(200).json({ status: 200, data: response });
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

        const buttonActions = await WorkflowController.getButtonAction(
          redisName,
          req.userId,
          isCache.workflowState
        );
        return res.status(200).json({
          status: 200,
          data: JSON.parse(cache),
          history: getHistory,
          workflow: buttonActions,
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
            from: "users",
            localField: "createdBy",
            foreignField: "_id",
            as: "createdBy",
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
          },
        },
        {
          $unwind: "$customer",
        },
        {
          $lookup: {
            from: "customergroups",
            localField: "customerGroup",
            foreignField: "_id",
            as: "customerGroup",
          },
        },
        {
          $unwind: "$customerGroup",
        },
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
          $lookup: {
            from: "usergroups",
            localField: "schedule.userGroup",
            foreignField: "_id",
            as: "userGroup",
          },
        },
        {
          $unwind: "$userGroup",
        },
        {
          $project: {
            _id: 1,
            "schedule._id": 1,
            "schedule.name": 1,
            "customer._id": 1,
            "customer.name": 1,
            status: 1,
            "createdBy._id": 1,
            "createdBy.name": 1,
            "customerGroup._id": 1,
            "customerGroup.name": 1,
            "userGroup._id": 1,
            "userGroup.name": 1,
            createdAt: 1,
            updatedAt: 1,
            "schedule.type": 1,
            "schedule.status": 1,
            "schedule.workflowState": 1,
            "schedule.closingDate": 1,
            "schedule.activeDate": 1,
          },
        },
      ]);

      if (getData.length === 0) {
        return res
          .status(404)
          .json({ status: 404, msg: "Error, Data tidak ditemukan!" });
      }

      const result = getData[0];

      const buttonActions = await WorkflowController.getButtonAction(
        redisName,
        req.userId,
        result.workflowState
      );

      console.log(result);
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
        workflow: buttonActions,
      });
    } catch (error) {
      return res.status(404).json({ status: 404, data: error });
    }
  };

  update = async (req: Request | any, res: Response): Promise<Response> => {
    // Cek data yang tidak boleh dirubah
    if (req.body.createdBy) {
      return res.status(404).json({
        status: 404,
        msg: "Error, createdby tidak dapat dirubah",
      });
    }
    if (req.body.schedule) {
      return res.status(404).json({
        status: 404,
        msg: "Error, schedule tidak dapat dirubah",
      });
    }
    // End

    try {
      const result: any = await Db.findOne({
        _id: req.params.id,
      });

      if (result) {
        // Cek hanya bisa di update ketika schedule masih draft
        if (result.schedule.status !== "0") {
          return res.status(404).json({
            status: 404,
            msg: `Error, Schedule ${result.schedule.name} bukan draft! `,
          });
        }
        // End

        // Apabila schedulelist di close
        if (result.status !== "0") {
          return res.status(404).json({
            status: 404,
            msg: `Error, list item ini sudah di close ${
              result.closing.doc.name
                ? `oleh dok ${result.closing.doc.name}`
                : ``
            } !`,
          });
        }
        // End

        // Cek jika status tidak ada atau bukan 0 tidak boleh update closing
        if (req.body.status === "1") {
          if (!req.body.closing) {
            return res.status(404).json({
              status: 404,
              msg: "Error, closing  wajib diisi!",
            });
          }
          // Cek bisa di close ketika schedule aktif
          if (result.schedule.status !== "1") {
            return res.status(404).json({
              status: 404,
              msg: `Error, Tidak dapat menutup list ini karena schedule ${result.schedule.name} tidak aktif!`,
            });
          }
          // End

          if (!req.body.closing.date) {
            return res.status(404).json({
              status: 404,
              msg: "Error, closing date wajib diisi!",
            });
          }

          if (!req.body.closing.docId) {
            return res.status(404).json({
              status: 404,
              msg: "Error, closing docId wajib diisi!",
            });
          }

          // Mengecek doc apakah tersedia
          let DBCek: any = visitModel;
          if (result.schedule.type === "callsheet") {
            // DBCek = CallSheetModel
          }

          const cekValidDoc = await DBCek.findOne({
            _id: new ObjectId(req.body.closing.docId),
          });

          if (!cekValidDoc) {
            return res.status(404).json({
              status: 404,
              msg: "Error, Closing doc tidak ditemukan!",
            });
          }

          req.body.closing.doc = {
            _id: new ObjectId(cekValidDoc._id),
            name: cekValidDoc.name,
          };

          // End

          req.body.closing.user = {
            _id: new ObjectId(req.userId),
            name: req.user,
          };
          // End
        }

        // End

        if (req.body.closing) {
          return res.status(404).json({
            status: 404,
            msg: "Error, gagal update closing!",
          });
        }

        //Mengecek jika Customer Group dirubah
        if (req.body.customerGroup) {
          if (typeof req.body.customerGroup !== "string") {
            return res.status(404).json({
              status: 404,
              msg: "Error, Cek kembali data customerGroup, Data harus berupa string id customerGroup!",
            });
          }

          const CekCG: any = await CustomerGroupModel.findOne({
            $and: [{ _id: req.body.customerGroup }],
          }).populate("branch", "name");

          if (!CekCG) {
            return res.status(404).json({
              status: 404,
              msg: "Error, customerGroup tidak ditemukan!",
            });
          }

          if (CekCG.status != 1) {
            return res.status(404).json({
              status: 404,
              msg: "Error, customerGroup tidak aktif!",
            });
          }
          // End

          // set setCustomerGroup
          req.body.customerGroup = {
            _id: CekCG._id,
            name: CekCG.name,
          };
          // End

          req.body.customerGroup.branch = CekCG.branch;
          // End
        }
        // End

        if (req.body.id_workflow && req.body.id_state) {
          const checkedWorkflow =
            await WorkflowController.permissionUpdateAction(
              req.body.id_workflow,
              req.userId,
              req.body.id_state,
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
        });

        await Redis.client.set(
          `${redisName}-${req.params.id}`,
          JSON.stringify(getData),
          {
            EX: 30,
          }
        );

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

export default new ScheduleListController();

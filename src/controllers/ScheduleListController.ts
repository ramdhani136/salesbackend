import { Request, Response, response } from "express";
import Redis from "../config/Redis";
import { IStateFilter } from "../Interfaces";
import { FilterQuery, cekValidPermission } from "../utils";
import IController from "./ControllerInterface";
import { TypeOfState } from "../Interfaces/FilterInterface";
import {
  CallsheetModel,
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
import { PermissionMiddleware } from "../middleware";
import {
  selPermissionAllow,
  selPermissionType,
} from "../middleware/PermissionMiddleware";

const redisName = "schedulelist";

class ScheduleListController implements IController {
  index = async (req: Request | any, res: Response): Promise<Response> => {
    const stateFilter: IStateFilter[] = [
      {
        alias: "Id",
        name: "_id",
        operator: ["=", "!="],
        typeOf: TypeOfState.String,
      },
      {
        alias: "Schedule",
        name: "schedule",
        operator: ["=", "!="],
        typeOf: TypeOfState.String,
      },
      {
        alias: "ScheduleType",
        name: "schedule.type",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
      },
      {
        alias: "ScheduleStatus",
        name: "schedule.status",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
      },
      {
        alias: "WorkflowState",
        name: "schedule.workflowState",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
      },
      {
        alias: "ActiveDate",
        name: "schedule.activeDate",
        operator: ["=", "!=", "like", "notlike", ">", "<", ">=", "<="],
        typeOf: TypeOfState.Date,
      },
      {
        alias: "ClosingDate",
        name: "schedule.closingDate",
        operator: ["=", "!=", "like", "notlike", ">", "<", ">=", "<="],
        typeOf: TypeOfState.Date,
      },
      {
        alias: "ScheduleCreatedAt",
        name: "schedule.createdAt",
        operator: ["=", "!=", "like", "notlike", ">", "<", ">=", "<="],
        typeOf: TypeOfState.Date,
      },
      // {
      //   alias: "UserGroup",
      //   name: "schedule.userGroup",
      //   operator: ["=", "!="],
      //   typeOf: TypeOfState.String,
      // },
      {
        alias: "Customer",
        name: "customer",
        operator: ["=", "!="],
        typeOf: TypeOfState.String,
      },
      {
        alias: "CustomerGroup",
        name: "customer.customerGroup",
        operator: ["=", "!="],
        typeOf: TypeOfState.String,
      },
      {
        alias: "Branch",
        name: "customer.branch",
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
        alias: "CreatedBy",
        name: "createdBy",
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

      const fields: any = req.query.fields
        ? JSON.parse(`${req.query.fields}`)
        : [
            "_id",
            "schedule._id",
            "schedule.name",
            "customer._id",
            "customer.name",
            "createdBy._id",
            "createdBy.name",
            "customerGroup._id",
            "customerGroup.name",
            "branch._id",
            "branch.name",
            // "userGroup._id",
            // "userGroup.name",
            "createdAt",
            "updatedAt",
          ];

      const order_by: any = req.query.order_by
        ? JSON.parse(`${req.query.order_by}`)
        : { updatedAt: -1 };
      const limit: number | string = parseInt(`${req.query.limit}`) || 10;
      let page: number | string = parseInt(`${req.query.page}`) || 1;
      let setField = FilterQuery.getField(fields);

      // Mengecek permission user
      const userPermission = await PermissionMiddleware.getPermission(
        req.userId,
        selPermissionAllow.USER,
        selPermissionType.CUSTOMER
      );
      // End

      // Mengambil rincian permission branch
      const branchPermission = await PermissionMiddleware.getPermission(
        req.userId,
        selPermissionAllow.BRANCH,
        selPermissionType.CUSTOMER
      );
      // End
      // Mengambil rincian permission customerGroup
      const groupPermission = await PermissionMiddleware.getPermission(
        req.userId,
        selPermissionAllow.CUSTOMERGROUP,
        selPermissionType.CUSTOMER
      );
      // End

      const customerPermission = await PermissionMiddleware.getPermission(
        req.userId,
        selPermissionAllow.CUSTOMER,
        selPermissionType.CUSTOMER
      );
      // End

      const notScheduleFIlter: any = filters.filter((item: any) => {
        const key = item[0]; // Ambil kunci pada indeks 0
        return !key.startsWith("schedule."); // Kembalikan true jika kunci diawali dengan "schedule."
      });

      const notCustomer: any = notScheduleFIlter.filter((item: any) => {
        const key = item[0]; // Ambil kunci pada indeks 0
        return !key.startsWith("customer."); // Kembalikan true jika kunci diawali dengan "schedule."
      });

      let isFilter = FilterQuery.getFilter(
        notCustomer,
        stateFilter,
        undefined,
        ["_id", "createdBy", "customer", "schedule"]
      );

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
            localField: "customer.customerGroup",
            foreignField: "_id",
            as: "customerGroup",
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
          },
        },
        {
          $unwind: "$branch",
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
        // {
        //   $lookup: {
        //     from: "usergroups",
        //     localField: "schedule.userGroup",
        //     foreignField: "_id",
        //     as: "userGroup",
        //   },
        // },
        // {
        //   $unwind: "$userGroup",
        // },
      ];

      //Menambahkan limit ketika terdapat limit
      if (limit > 0) {
        pipeline.splice(3, 0, { $limit: limit });
      }

      // End
      if (Object.keys(setField).length > 0) {
        pipeline.push({
          $project: setField,
        });
      }

      let pipelineTotal: any = [isFilter.data];

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

      if (scheduleFIlter.length > 0) {
        const validScheduleFIlter = FilterQuery.getFilter(
          scheduleFIlter,
          stateSchedule,
          undefined,
          // ["_id", "userGroup"]
          ["_id"]
        );

        const schedulesData = await ScheduleModel.find(
          validScheduleFIlter.data,
          ["_id"]
        );

        if (schedulesData.length > 0) {
          const finalFilterSchedule = schedulesData.map((item) => {
            return item._id;
          });

          pipeline.unshift({
            $match: {
              schedule: { $in: finalFilterSchedule },
            },
          });

          pipelineTotal.unshift({
            schedule: { $in: finalFilterSchedule },
          });
        } else {
          return res.status(400).json({
            status: 404,
            msg: "Data tidak ditemukan!",
          });
        }
      }

      // End

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

      if (customerFIlter.length > 0 || req.query.search) {
        let search: ISearch = {
          filter: ["name"],
          value: req.query.search || "",
        };
        const validCustomer = FilterQuery.getFilter(
          customerFIlter,
          stateCustomer,
          search,
          ["_id", "customerGroup", "branch"]
        );

        const customerData = await CustomerModel.find(validCustomer.data, [
          "_id",
        ]);

        if (customerData.length > 0) {
          const finalFilterCustomer = customerData.map((item) => {
            return item._id;
          });

          pipeline.unshift({
            $match: {
              customer: { $in: finalFilterCustomer },
            },
          });

          pipelineTotal.unshift({
            customer: { $in: finalFilterCustomer },
          });
        } else {
          return res.status(400).json({
            status: 404,
            msg: "Data Not found!",
          });
        }
      }
      // End

      // Cek Permission User

      if (
        userPermission.length > 0 ||
        branchPermission.length > 0 ||
        groupPermission.length > 0 ||
        customerPermission.length > 0
      ) {
        let pipelineCustomer: any = [];

        if (userPermission.length > 0) {
          pipelineCustomer.push({ createdBy: { $in: userPermission } });
        }
        if (branchPermission.length > 0) {
          pipelineCustomer.push({ branch: { $in: branchPermission } });
        }
        if (groupPermission.length > 0) {
          pipelineCustomer.push({ customerGroup: { $in: groupPermission } });
        }
        if (customerPermission.length > 0) {
          pipelineCustomer.push({ _id: { $in: customerPermission } });
        }

        const customer = await CustomerModel.find(
          { $and: pipelineCustomer },
          { _id: 1 }
        );

        if (customer.length === 0) {
          return res.status(403).json({
            status: 404,
            msg: "Data tidak ditemukan!",
          });
        }

        const validPermission = customer.map((item) => {
          return item._id;
        });

        pipelineTotal.unshift({ customer: { $in: validPermission } });
        pipeline.unshift({ $match: { customer: { $in: validPermission } } });
      }

      // End

      const getAll = await Db.find({
        $and: pipelineTotal,
      }).count();
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
        // .populate("userGroup", "name")
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
        const cekPermission = await cekValidPermission(
          req.userId,
          {
            user: isCache.customer.createdBy,
            group: isCache.customerGroup._id,
            customer: isCache.customer._id,
            branch: isCache.branch._id,
          },
          selPermissionType.CUSTOMER
        );

        if (!cekPermission) {
          return res.status(403).json({
            status: 403,
            msg: "Anda tidak mempunyai akses untuk dok ini!",
          });
        }
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
            localField: "customer.customerGroup",
            foreignField: "_id",
            as: "customerGroup",
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
          },
        },
        {
          $unwind: "$branch",
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
        // {
        //   $lookup: {
        //     from: "usergroups",
        //     localField: "schedule.userGroup",
        //     foreignField: "_id",
        //     as: "userGroup",
        //   },
        // },
        // {
        //   $unwind: "$userGroup",
        // },
        {
          $project: {
            _id: 1,
            "schedule._id": 1,
            "schedule.name": 1,
            "schedule.createdBy": 1,
            "customer._id": 1,
            "customer.name": 1,
            "customer.createdBy": 1,
            status: 1,
            "createdBy._id": 1,
            "createdBy.name": 1,
            "customerGroup._id": 1,
            "customerGroup.name": 1,
            "branch._id": 1,
            "branch.name": 1,
            // "userGroup._id": 1,
            // "userGroup.name": 1,
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

      const cekPermission = await cekValidPermission(
        req.userId,
        {
          user: result.customer.createdBy,
          group: result.customerGroup._id,
          customer: result.customer._id,
          branch: result.branch._id,
        },
        selPermissionType.CUSTOMER
      );

      if (!cekPermission) {
        return res.status(403).json({
          status: 403,
          msg: "Anda tidak mempunyai akses untuk dok ini!",
        });
      }
      const buttonActions = await WorkflowController.getButtonAction(
        redisName,
        req.userId,
        result.workflowState
      );

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

    // End

    const pipeline = [
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
          localField: "customer.customerGroup",
          foreignField: "_id",
          as: "customerGroup",
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
        },
      },
      {
        $unwind: "$branch",
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
      // {
      //   $lookup: {
      //     from: "usergroups",
      //     localField: "schedule.userGroup",
      //     foreignField: "_id",
      //     as: "userGroup",
      //   },
      // },
      // {
      //   $unwind: "$userGroup",
      // },
      {
        $project: {
          _id: 1,
          "schedule._id": 1,
          "schedule.name": 1,
          "customer._id": 1,
          "customer.name": 1,
          "customer.createdBy": 1,
          status: 1,
          "createdBy._id": 1,
          "createdBy.name": 1,
          "customerGroup._id": 1,
          "customerGroup.name": 1,
          "branch._id": 1,
          "branch.name": 1,
          // "userGroup._id": 1,
          // "userGroup.name": 1,
          createdAt: 1,
          updatedAt: 1,
          "schedule.type": 1,
          "schedule.status": 1,
          "schedule.workflowState": 1,
          "schedule.closingDate": 1,
          "schedule.activeDate": 1,
        },
      },
    ];

    try {
      const cekData: any = await Db.aggregate(pipeline);
      if (cekData.length > 0) {
        const result = cekData[0];

        const cekPermission = await cekValidPermission(
          req.userId,
          {
            user: result.customer.createdBy,
            group: result.customerGroup._id,
            customer: result.customer._id,
            branch: result.branch._id,
          },
          selPermissionType.CUSTOMER
        );

        if (!cekPermission) {
          return res.status(403).json({
            status: 403,
            msg: "Anda tidak mempunyai akses untuk dok ini!",
          });
        }

        const prevDataBanding = await Db.findOne({
          _id: new ObjectId(req.params.id),
        })
          .populate("schedule", "name")
          .populate("customer", "name")
          .populate("createdBy", "name");

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
          // Cek bisa di close ketika schedule aktif
          if (result.schedule.status !== "1") {
            return res.status(404).json({
              status: 404,
              msg: `Error, Tidak dapat menutup list ini karena schedule ${result.schedule.name} tidak aktif!`,
            });
          }
          // End

          if (!req.body.closing?.date) {
            return res.status(404).json({
              status: 404,
              msg: "Error, closing date wajib diisi!",
            });
          }

          if (!req.body.closing?.docId) {
            return res.status(404).json({
              status: 404,
              msg: "Error, closing docId wajib diisi!",
            });
          }

          // Mengecek doc apakah tersedia
          let DBCek: any = visitModel;
          if (result.schedule.type === "callsheet") {
            DBCek = CallsheetModel;
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

        //Mengecek Schedule
        if (req.body.schedule) {
          const cekSchedule: any = await ScheduleModel.findOne({
            $and: [{ _id: req.body.schedule }],
          })
            // .populate("userGroup", "name")
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
              msg: "Error, hanya bisa merubah list schedule saat dokumen status draft!",
            });
          }

          req.body.schedule = cekSchedule._id;
          // End
        }

        // set setSchedule

        // End

        if (req.body.customer) {
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
        }

        if (req.body.customer || req.body.schedule) {
          // Cek Duplikat data
          const dupl: any = await Db.findOne({
            $and: [
              {
                schedule: req.body.schedule
                  ? new ObjectId(req.body.schedule)
                  : result.schedule,
              },
              {
                customer: req.body.customer
                  ? new ObjectId(req.body.customer)
                  : result.customer,
              },
              {
                _id: { $ne: req.params.id },
              },
            ],
          });

          if (dupl) {
            return res.status(404).json({
              status: 404,
              msg: `Error, customer ini sudah ada di dalam schedule !`,
            });
          }
        }

        await Db.updateOne({ _id: req.params.id }, req.body);

        const realData: any = await Db.aggregate(pipeline);

        const getData = realData[0];

        const dataUpdate = await Db.findOne({
          _id: new ObjectId(req.params.id),
        })
          .populate("schedule", "name")
          .populate("customer", "name")
          .populate("createdBy", "name");

        await Redis.client.set(
          `${redisName}-${req.params.id}`,
          JSON.stringify(getData),
          {
            EX: 30,
          }
        );

        // push history semua field yang di update
        await HistoryController.pushUpdateMany(
          prevDataBanding,
          dataUpdate,
          req.user,
          req.userId,
          redisName
        );

        return res.status(200).json({ status: 200, data: getData });
        // End
      } else {
        return res
          .status(400)
          .json({ status: 404, msg: "Error update, data tidal ditemukan!" });
      }
    } catch (error: any) {
      return res.status(404).json({ status: 404, data: error });
    }
  };

  delete = async (req: Request | any, res: Response): Promise<Response> => {
    try {
      const getData: any = await Db.findOne({ _id: req.params.id }).populate(
        "customer",
        "branch customerGroup createdBy"
      );

      if (!getData) {
        return res
          .status(404)
          .json({ status: 404, msg: "Data tidak ditemukan!!" });
      }

      const cekPermission = await cekValidPermission(
        req.userId,
        {
          user: getData.customer.createdBy,
          group: getData.customer.customerGroup,
          customer: getData.customer._id,
          branch: getData.customer.branch,
        },
        selPermissionType.CUSTOMER
      );

      if (!cekPermission) {
        return res.status(403).json({
          status: 403,
          msg: "Anda tidak mempunyai akses untuk dok ini!",
        });
      }

      const result = await Db.deleteOne({ _id: req.params.id });
      await Redis.client.del(`${redisName}-${req.params.id}`);
      // Delete Child
      await this.DeletedRelateChild(getData);
      // End
      return res.status(200).json({ status: 200, data: result });
    } catch (error) {
      return res.status(404).json({ status: 404, msg: error });
    }
  };

  protected DeletedRelateChild = async (data: any): Promise<any> => {
    try {
      // Update Visit
      if (data.status !== "0" && data.schedule.type === "visit") {
        const visit = await visitModel.find(
          {
            schedulelist: { $in: [data._id] },
          },
          { schedulelist: 1 }
        );

        if (visit.length > 0) {
          for (const visitItem of visit) {
            let visitId = visitItem._id;
            let schedulelist = visitItem.schedulelist.filter((i: any) => {
              return i.toString() !== data._id.toString();
            });

            await visitModel.findByIdAndUpdate(visitId, {
              schedulelist: schedulelist,
            });
          }
        }
      }
      // End

      // Update callsheet
      if (data.status !== "0" && data.schedule.type === "callsheet") {
        const callsheet = await CallsheetModel.find(
          {
            schedulelist: { $in: [data._id] },
          },
          { schedulelist: 1 }
        );

        if (callsheet.length > 0) {
          for (const callsheetItem of callsheet) {
            let callsheetId = callsheetItem._id;
            let schedulelist = callsheetItem.schedulelist.filter((i: any) => {
              return i.toString() !== data._id.toString();
            });

            await CallsheetModel.findByIdAndUpdate(callsheetId, {
              schedulelist: schedulelist,
            });
          }
        }
      }
      // End
    } catch (error) {
      throw error;
    }
    // End
  };
}

export default new ScheduleListController();

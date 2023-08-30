import { Request, Response } from "express";
// import Redis from "../config/Redis";
import { IStateFilter } from "../Interfaces";
import {
  CekKarakterSama,
  FilterQuery,
  HapusKarakter,
  PaddyData,
  cekValidPermission,
} from "../utils";
import IController from "./ControllerInterface";
import { TypeOfState } from "../Interfaces/FilterInterface";
import {
  BranchModel,
  CallSheetNoteModel,
  ConfigModel,
  ContactModel,
  CustomerGroupModel,
  CustomerModel,
  CallsheetModel as Db,
  FileModel,
  History,
  MemoModel,
  NotesModel,
  ScheduleListModel,
  TopicModel,
  UserGroupListModel,
  namingSeriesModel,
} from "../models";
import { PermissionMiddleware } from "../middleware";
import path from "path";
import fs from "fs";
import {
  selPermissionAllow,
  selPermissionType,
} from "../middleware/PermissionMiddleware";
import { ObjectId } from "mongodb";
import HistoryController from "./HistoryController";
import WorkflowController from "./WorkflowController";
import { ISearch } from "../utils/FilterQuery";

const redisName = "callsheet";

class CallsheetController implements IController {
  index = async (req: Request | any, res: Response): Promise<Response> => {
    const stateFilter: IStateFilter[] = [
      {
        alias: "Name",
        name: "name",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
        isSort: true,
      },
      {
        alias: "Type",
        name: "type",
        operator: ["=", "!="],
        typeOf: TypeOfState.String,
        isSort: true,
        listData: [
          { value: "in", name: "In Coming Call" },
          { value: "out", name: "Out Going Call" },
        ],
      },
      {
        alias: "ScheduleList",
        name: "schedulelist",
        operator: ["=", "!="],
        typeOf: TypeOfState.String,
      },
      {
        alias: "Contact",
        name: "contact",
        operator: ["=", "!="],
        typeOf: TypeOfState.String,
      },
      {
        alias: "Customer",
        name: "customer",
        operator: ["=", "!="],
        typeOf: TypeOfState.String,
      },

      {
        alias: "CustomerType",
        name: "customer.type",
        operator: ["=", "!="],
        typeOf: TypeOfState.String,
        listData: [
          { value: "Company", name: "Company" },
          { value: "Individual", name: "Individual" },
        ],
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
        alias: "CreatedBy",
        name: "createdBy",
        operator: ["=", "!="],
        typeOf: TypeOfState.String,
      },
      {
        alias: "Status",
        name: "status",
        operator: ["=", "!="],
        typeOf: TypeOfState.String,
        isSort: true,
        listData: [
          { value: "0", name: "Draft" },
          { value: "1", name: "Submitted" },
          { value: "2", name: "Canceled" },
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
      const filters: any = req.query.filters
        ? JSON.parse(`${req.query.filters}`)
        : [];
      const fields: any = req.query.fields
        ? JSON.parse(`${req.query.fields}`)
        : [
            "name",
            "type",
            "createdBy._id",
            "createdBy.name",
            "contact._id",
            "contact.name",
            "contact.phone",
            "updatedAt",
            "customer._id",
            "customerGroup._id",
            "branch._id",
            "customer.name",
            "customerGroup.name",
            "branch.name",
            "status",
            "workflowState",
            "schedulelist._id",
            "schedulelist.schedule",
            "schedulelist.notes",
            "rate",
          ];
      const order_by: any = req.query.order_by
        ? JSON.parse(`${req.query.order_by}`)
        : { updatedAt: -1 };
      const limit: number | string = parseInt(`${req.query.limit}`) || 10;
      let page: number | string = parseInt(`${req.query.page}`) || 1;
      let setField = FilterQuery.getField(fields);

      const notCustomer: any = filters.filter((item: any) => {
        const key = item[0]; // Ambil kunci pada indeks 0
        return !key.startsWith("customer."); // Kembalikan true jika kunci diawali dengan "schedule."
      });

      let search: ISearch = {
        filter: ["name"],
        value: req.query.search || "",
      };
      let isFilter = FilterQuery.getFilter(notCustomer, stateFilter, search, [
        "customer",
        "schedulelist",
        "createdBy",
        "_id",
        "contact",
      ]);

      // Mengambil rincian permission user
      const userPermission = await PermissionMiddleware.getPermission(
        req.userId,
        selPermissionAllow.USER,
        selPermissionType.CALLSHEET
      );
      // End

      // Mengambil rincian permission customer
      const customerPermission = await PermissionMiddleware.getPermission(
        req.userId,
        selPermissionAllow.CUSTOMER,
        selPermissionType.CALLSHEET
      );
      // End

      // Mengambil rincian permission group
      const groupPermission = await PermissionMiddleware.getPermission(
        req.userId,
        selPermissionAllow.CUSTOMERGROUP,
        selPermissionType.CALLSHEET
      );
      // End

      // Mengambil rincian permission branch
      const branchPermission = await PermissionMiddleware.getPermission(
        req.userId,
        selPermissionAllow.BRANCH,
        selPermissionType.CALLSHEET
      );
      // End

      if (!isFilter.status) {
        return res
          .status(400)
          .json({ status: 400, msg: "Error, Filter Invalid " });
      }
      // End

      let pipelineTotal: any = [isFilter.data];

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
            from: "contacts",
            localField: "contact",
            foreignField: "_id",
            as: "contact",
          },
        },
        {
          $unwind: {
            path: "$contact",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "schedulelists",
            localField: "schedulelist",
            foreignField: "_id",
            as: "schedulelist",
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
                  "schedule.notes": 1,
                  "schedule.closingDate": 1,
                },
              },
            ],
          },
        },
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

      // Menambahkan filter berdasarkan permission user
      if (userPermission.length > 0) {
        pipeline.unshift({
          $match: {
            createdBy: { $in: userPermission.map((id) => new ObjectId(id)) },
          },
        });
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

      if (
        customerFIlter.length > 0 ||
        // req.query.search ||
        branchPermission.length > 0 ||
        groupPermission.length > 0
      ) {
        // let search: ISearch = {
        //   filter: ["name"],
        //   value: req.query.search || "",
        // };

        const notCustomerGroupFilter = customerFIlter.filter(
          (item: any[]) => item[0] !== "customerGroup"
        );

        const validCustomer = FilterQuery.getFilter(
          notCustomerGroupFilter,
          stateCustomer,
          // search,
          undefined,
          ["_id", "customerGroup", "branch"]
        );

        let pipelineCustomer: any = [validCustomer.data];

        const isCustomerGroup = customerFIlter
          .filter((item: any[]) => item[0] === "customerGroup")
          .map((i: any) => new ObjectId(i[2]));

        if (isCustomerGroup.length > 0) {
          const childGroup = await PermissionMiddleware.getCustomerChild(
            isCustomerGroup
          );
          pipelineCustomer.unshift({ customerGroup: { $in: childGroup } });
        }

        if (branchPermission.length > 0) {
          pipelineCustomer.unshift({ branch: { $in: branchPermission } });
        }

        if (groupPermission.length > 0) {
          pipelineCustomer.unshift({ customerGroup: { $in: groupPermission } });
        }

        const customerData = await CustomerModel.find(
          { $and: pipelineCustomer },
          ["_id"]
        );

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

      if (customerPermission.length > 0) {
        pipeline.unshift({
          $match: {
            customer: { $in: customerPermission },
          },
        });
        pipelineTotal.unshift({
          customer: { $in: customerPermission },
        });
      }

      // End

      const getAll = await Db.find({ $and: pipelineTotal }).count();
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
    if (!req.body.type) {
      return res
        .status(400)
        .json({ status: 400, msg: "Error, type wajib diisi!" });
    } else {
      if (req.body.type !== "in" && req.body.type !== "out") {
        return res
          .status(400)
          .json({ status: 400, msg: "Error, pilih in atau out !" });
      }
    }

    try {
      // Set nama/nomor doc
      // Cek naming series
      if (!req.body.namingSeries) {
        return res
          .status(400)
          .json({ status: 400, msg: "Error, namingSeries wajib diisi!" });
      }

      if (typeof req.body.namingSeries !== "string") {
        return res.status(404).json({
          status: 404,
          msg: "Error, Cek kembali data namingSeries, Data harus berupa string id namingSeries!",
        });
      }

      const namingSeries: any = await namingSeriesModel.findOne({
        $and: [{ _id: req.body.namingSeries }, { doc: "callsheet" }],
      });

      if (!namingSeries) {
        return res
          .status(400)
          .json({ status: 400, msg: "Error, namingSeries tidak ditemukan!" });
      }

      //End

      const split = namingSeries.name.split(".");

      const jumlahKarakter = HapusKarakter(namingSeries.name, ["."]).length;

      let ambilIndex: String = "";
      const olahKata = split.map((item: any) => {
        if (item === "YYYY") {
          return new Date().getFullYear().toString();
        } else if (item === "MM") {
          return PaddyData(new Date().getMonth() + 1, 2).toString();
        } else {
          if (item.includes("#")) {
            if (CekKarakterSama(item)) {
              if (!ambilIndex) {
                if (item.length > 2) {
                  ambilIndex = item;
                }
              }
              return "";
            }
          }

          return item;
        }
      });

      let latest = 0;

      const regex = new RegExp(olahKata.join(""), "i");

      const callsheet = await Db.findOne({
        $and: [
          { name: { $regex: regex } },
          {
            $where: `this.name.length === ${
              ambilIndex ? jumlahKarakter : jumlahKarakter + 4
            }`,
          },
        ],
      })
        .sort({ createdAt: -1 })
        .exec();

      if (callsheet) {
        latest = parseInt(
          `${callsheet.name.slice(ambilIndex ? -ambilIndex.length : -4)}`
        );
      }

      req.body.name = ambilIndex
        ? olahKata.join("") +
          PaddyData(latest + 1, ambilIndex.length).toString()
        : olahKata.join("") + PaddyData(latest + 1, 4).toString();
      // End set name

      //Mengecek Customer
      if (!req.body.customer) {
        return res
          .status(400)
          .json({ status: 400, msg: "Error, customer wajib diisi!" });
      }

      const cekCustomer: any = await CustomerModel.findOne(
        {
          $and: [{ _id: req.body.customer }],
        },
        ["name", "status", "customerGroup"]
      );

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

      req.body.customer = cekCustomer._id;
      // End

      // // Mengecek contact jika terdapat kontak untuk customer
      // if (!req.body.contact) {
      //   return res
      //     .status(400)
      //     .json({ status: 400, msg: "Error, contact wajib diisi!" });
      // }
      // const contact = await ContactModel.findOne(
      //   {
      //     $and: [
      //       { _id: req.body.contact },
      //       {
      //         customer: req.body.customer,
      //       },
      //     ],
      //   },
      //   ["name", "phone", "status"]
      // );

      // if (!contact) {
      //   return res.status(404).json({
      //     status: 404,
      //     msg: "Error, kontak tidak ditemukan!",
      //   });
      // }

      // if (contact.status !== "1") {
      //   return res.status(404).json({
      //     status: 404,
      //     msg: "Error, kontak tidak aktif!",
      //   });
      // }

      // // set contact
      // req.body.contact = contact._id;

      // // End

      req.body.createdBy = req.userId;

      const result = new Db(req.body);
      const response: any = await result.save({});

      //push history
      await HistoryController.pushHistory({
        document: {
          _id: response._id,
          name: response.name,
          type: redisName,
        },
        message: `menambahkan callsheet ${response.name} `,
        user: req.userId,
      });
      //End

      return res.status(200).json({ status: 200, data: response });
    } catch (error) {
      return res
        .status(400)
        .json({ status: 400, msg: error ?? "Error Connection!" });
    }
  };

  show = async (req: Request | any, res: Response): Promise<Response> => {
    try {
      // const cache = await Redis.client.get(`${redisName}-${req.params.id}`);
      // if (cache) {
      //   const isCache = JSON.parse(cache);

      //   const cekPermission = await cekValidPermission(
      //     req.userId,
      //     {
      //       user: isCache.createdBy._id,
      //       branch: isCache.branch._id,
      //       group: isCache.customerGroup._id,
      //       customer: isCache.customer._id,
      //     },
      //     selPermissionType.CALLSHEET
      //   );

      //   if (!cekPermission) {
      //     return res.status(403).json({
      //       status: 403,
      //       msg: "Anda tidak mempunyai akses untuk dok ini!",
      //     });
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

      let pipeline: any[] = [
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
            from: "contacts",
            localField: "contact",
            foreignField: "_id",
            as: "contact",
          },
        },
        {
          $unwind: {
            path: "$contact",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "schedulelists",
            localField: "schedulelist",
            foreignField: "_id",
            as: "schedulelist",
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
                  "schedule.notes": 1,
                  "schedule.closingDate": 1,
                },
              },
            ],
          },
        },

        {
          $project: {
            _id: 1,
            name: 1,
            type: 1,
            status: 1,
            workflowState: 1,
            "schedulelist._id": 1,
            "schedulelist.schedule": 1,
            "schedulelist.notes": 1,
            "contact._id": 1,
            "contact.name": 1,
            "contact.phone": 1,
            "contact.position": 1,
            "customer._id": 1,
            "customer.erpId": 1,
            "customer.name": 1,
            "createdBy._id": 1,
            "createdBy.name": 1,
            "customerGroup._id": 1,
            "customerGroup.name": 1,
            "branch._id": 1,
            "branch.name": 1,
            createdAt: 1,
            updatedAt: 1,
            rate: 1,
            taskNotes: 1,
          },
        },
      ];

      pipeline.unshift({
        $match: {
          _id: new ObjectId(req.params.id),
        },
      });

      const getData: any = await Db.aggregate(pipeline);

      if (getData.length === 0) {
        return res
          .status(404)
          .json({ status: 404, msg: "Error, Data tidak ditemukan!" });
      }

      let result = getData[0];

      const cekPermission = await cekValidPermission(
        req.userId,
        {
          user: result.createdBy._id,
          branch: result.branch._id,
          group: result.customerGroup._id,
          customer: result.customer._id,
        },
        selPermissionType.CALLSHEET
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

      // Cek Notes dari memo dan juga dari schedule jika status draft
      if (result.status === "0") {
        const getTaskNotes: any = await this.CheckNotes(
          result.customer._id,
          req.userId
        );
        if (getTaskNotes.length > 0) {
          result.taskNotes = getTaskNotes;
        }
      }
      // End

      // await Redis.client.set(
      //   `${redisName}-${req.params.id}`,
      //   JSON.stringify(result)
      // );

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

  CheckNotes = async (
    customerId: ObjectId,
    userId: string,
    doc?: String
  ): Promise<any[]> => {
    let taskNotes: any[] = [];

    // Cek memo
    try {
      let memoPipeline: any[] = [
        { display: doc ? doc : redisName },
        { status: "1" },
      ];

      // Cek permission user

      // Branch
      // Mengecek permission user
      const userBranchPermission = await PermissionMiddleware.getPermission(
        userId,
        selPermissionAllow.USER,
        selPermissionType.BRANCH
      );
      // End

      // Mengecek permission branch
      const branchPermission = await PermissionMiddleware.getPermission(
        userId,
        selPermissionAllow.BRANCH,
        selPermissionType.BRANCH
      );

      if (branchPermission.length > 0 || userBranchPermission.length > 0) {
        let pipelineBranch: any = [];

        if (userBranchPermission.length > 0) {
          pipelineBranch.push({ createdBy: { $in: userBranchPermission } });
        }

        if (branchPermission.length > 0) {
          pipelineBranch.push({ _id: { $in: branchPermission } });
        }
        const branch = await BranchModel.find(
          { $and: pipelineBranch },
          { _id: 1 }
        );

        if (branch.length > 0) {
          const validBranch = branch.map((item) => item._id);

          memoPipeline.unshift({
            $or: [{ branch: [] }, { branch: { $in: validBranch } }],
          });
        } else {
          memoPipeline.unshift({
            $or: [{ branch: [] }],
          });
        }
      }

      // End Branch

      // CustomerGroup

      // Mengecek customer Group
      // Mengambil rincian permission user
      const groupUserPermission = await PermissionMiddleware.getPermission(
        userId,
        selPermissionAllow.USER,
        selPermissionType.CUSTOMERGROUP
      );
      // End
      // Mengambil rincian permission branch
      const groupBanchPermission = await PermissionMiddleware.getPermission(
        userId,
        selPermissionAllow.BRANCH,
        selPermissionType.CUSTOMERGROUP
      );
      // End
      // Mengambil rincian permission customerGroup
      const groupGroupPermission = await PermissionMiddleware.getPermission(
        userId,
        selPermissionAllow.CUSTOMERGROUP,
        selPermissionType.CUSTOMERGROUP
      );
      // End

      if (
        groupUserPermission.length > 0 ||
        groupBanchPermission.length > 0 ||
        groupGroupPermission.length > 0
      ) {
        let pipelineGroup: any = [];

        if (groupUserPermission.length > 0) {
          pipelineGroup.push({ createdBy: { $in: groupUserPermission } });
        }

        if (groupBanchPermission.length > 0) {
          pipelineGroup.push({ branch: { $in: groupBanchPermission } });
        }

        if (groupGroupPermission.length > 0) {
          pipelineGroup.push({ _id: { $in: groupGroupPermission } });
        }
        const group = await CustomerGroupModel.find(
          { $and: pipelineGroup },
          { _id: 1 }
        );
        if (group.length > 0) {
          const validGroup = group.map((item) => item._id);
          memoPipeline.unshift({
            $or: [
              { customerGroup: [] },
              { customerGroup: { $in: validGroup } },
            ],
          });
        } else {
          memoPipeline.unshift({
            $or: [{ customerGroup: [] }],
          });
        }
      }

      // End CustomerGroup

      // Cek userGroup
      const userGroupList = await UserGroupListModel.find(
        {
          user: new ObjectId(userId),
        },
        { userGroup: 1 }
      );

      if (userGroupList.length > 0) {
        const validUserGroup: any[] = userGroupList.map(
          (item) => item.userGroup
        );

        memoPipeline.unshift({
          $or: [{ userGroup: [] }, { userGroup: { $in: validUserGroup } }],
        });
      } else {
        memoPipeline.unshift({
          $or: [{ userGroup: [] }],
        });
      }
      // End

      // End permission user

      const memo: any = await MemoModel.find(
        {
          $and: memoPipeline,
        },
        { notes: 1, name: 1, title: 1 }
      );

      const finalMemoNotes: any = memo.map((item: any) => {
        return {
          _id: item._id,
          from: "Memo",
          name: item.name,
          title: item.title,
          notes: item.notes,
        };
      });
      if (finalMemoNotes.length > 0) {
        taskNotes.push(...finalMemoNotes);
      }
    } catch (error) {
      throw error;
    }
    // End

    // Cek Schedulelist
    try {
      let data = await ScheduleListModel.aggregate([
        {
          $match: {
            $and: [{ status: "0" }, { customer: customerId }],
          },
        },
        {
          $lookup: {
            from: "schedules",
            localField: "schedule",
            foreignField: "_id",
            as: "schedule",
            pipeline: [
              {
                $match: {
                  $and: [
                    { status: "1" },
                    {
                      $or: [
                        {
                          type: "all",
                        },
                        {
                          type: !doc ? redisName : doc,
                        },
                      ],
                    },
                  ],
                },
              },
              {
                $project: {
                  _id: 1,
                  name: 1,
                  notes: 1,
                  type: 1,
                },
              },
            ],
          },
        },
        {
          $unwind: "$schedule",
        },

        {
          $project: {
            _id: 1,
            schedule: 1,
            notes: 1,
          },
        },
      ]);

      if (data.length > 0) {
        const finalNotesSchedule = data.map((i) => {
          return {
            _id: i._id,
            from: "Schedule",
            name: i.schedule.name,
            title: `Task Schedule ${i.schedule.name} `,
            notes: `${i.notes ? i.notes : ""}${
              i.notes !== undefined && i.schedule.notes !== undefined
                ? " & "
                : ""
            }${i.schedule.notes ? i.schedule.notes : ""}`,
          };
        });

        if (finalNotesSchedule.length > 0) {
          taskNotes.push(...finalNotesSchedule);
        }
      }
    } catch (error) {
      throw error;
    }
    // End

    return taskNotes;
  };

  update = async (req: Request | any, res: Response): Promise<any> => {
    // Validasi yang tidak boleh di rubah

    if (req.body.createdBy) {
      return res.status(404).json({
        status: 404,
        msg: "Error, Tidak dapat merubah data createdBy!",
      });
    }
    if (req.body.name) {
      return res.status(404).json({
        status: 404,
        msg: "Error, Tidak dapat merubah nomor dokumen!",
      });
    }
    if (req.body.status) {
      return res.status(404).json({
        status: 404,
        msg: "Error, status tidak dapat dirubah",
      });
    }
    if (req.body.schedule) {
      return res.status(404).json({
        status: 404,
        msg: "Error, schedule tidak dapat dirubah",
      });
    }
    if (req.body.workflowState) {
      return res.status(404).json({
        status: 404,
        msg: "Error, workflowState tidak dapat dirubah",
      });
    }
    // End

    try {
      let pipeline: any[] = [];

      pipeline.unshift({
        _id: new ObjectId(req.params.id),
      });

      const result: any = await Db.findOne({
        $and: pipeline,
      })
        .populate("customer", "name")
        .populate("contact", "name")
        .populate("createdBy", "name");

      if (result.status !== "0") {
        if (req.body.type) {
          return res.status(404).json({
            status: 404,
            msg: "Error, Gagal merubah type, status dokumen bukan draft",
          });
        }
        if (req.body.customer) {
          return res.status(404).json({
            status: 404,
            msg: "Error, Gagal merubah customer, status dokumen bukan draft",
          });
        }
        if (req.body.rate) {
          return res.status(404).json({
            status: 404,
            msg: "Error, Gagal merubah rate, status dokumen bukan draft",
          });
        }
        if (req.body.contact) {
          return res.status(404).json({
            status: 404,
            msg: "Error, Gagal merubah contact, status dokumen bukan draft",
          });
        }
      }
      if (req.body.type) {
        if (req.body.type !== "in" && req.body.type !== "out") {
          return res
            .status(400)
            .json({ status: 400, msg: "Error, Type pilih in atau out !" });
        }
      }

      if (result) {
        const getDataPermit: any = await Db.findOne(
          {
            $and: pipeline,
          },
          { _id: 1, customer: 1, createdBy: 1 }
        ).populate("customer", "customerGroup branch");

        const cekPermission = await cekValidPermission(
          req.userId,
          {
            user: getDataPermit.createdBy,
            branch: getDataPermit.customer.branch,
            group: getDataPermit.customer.customerGroup,
            customer: getDataPermit.customer._id,
          },
          selPermissionType.CALLSHEET
        );
        if (!cekPermission) {
          return res.status(403).json({
            status: 403,
            msg: "Anda tidak mempunyai akses untuk dok ini!",
          });
        }

        //Mengecek Customer
        if (req.body.customer) {
          if (req.body.customer !== `${result.customer._id}`) {
            const cekCustomer: any = await CustomerModel.findOne(
              {
                $and: [{ _id: req.body.customer }],
              },
              ["name", "status", "customerGroup"]
            );

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

            req.body.customer = cekCustomer._id;
            if (!req.body.contact) {
              return res.status(404).json({
                status: 404,
                msg: "Error, data kontak sebelumnya tidak tersedia untuk konsumen ini, Silahkan ubah data kontak!",
              });
            }
          }
        }
        // End

        // Mengecek contact jika terdapat kontak untuk customer
        if (req.body.contact) {
          if (req.body.contact !== `${result?.contact?._id}`) {
            const contact = await ContactModel.findOne(
              {
                $and: [
                  { _id: req.body.contact },
                  {
                    customer: req.body.customer
                      ? req.body.customer
                      : result.customer._id,
                  },
                ],
              },
              ["name", "phone", "status"]
            );

            if (!contact) {
              return res.status(404).json({
                status: 404,
                msg: "Error, kontak tidak ditemukan!",
              });
            }

            if (contact.status !== "1") {
              return res.status(404).json({
                status: 404,
                msg: "Error, kontak tidak aktif!",
              });
            }

            // set contact
            req.body.contact = contact._id;
          }
        }
        // End

        if (req.body.nextState) {
          const checkedWorkflow: any =
            await WorkflowController.permissionUpdateAction(
              redisName,
              req.userId,
              req.body.nextState,
              result.createdBy
            );

          if (checkedWorkflow.status) {
            const prevData = {
              status: parseInt(result.status),
              workflowState: result.workflowState,
            };

            if (
              JSON.stringify(prevData) !== JSON.stringify(checkedWorkflow.data)
            ) {
              if (result.status == "0" && checkedWorkflow.data.status == 1) {
                // Cek contact wajib diisi
                if (!req.body.contact && !result.contact) {
                  return res
                    .status(400)
                    .json({ status: 400, msg: "Gagal, contact wajib diisi!" });
                }
                // End

                // Cek config callsheet
                const config: any = await ConfigModel.findOne(
                  {},
                  { callsheet: 1 }
                )
                  .populate("callsheet.tagsMandatory", "name")
                  .populate("callsheet.topicMandatory", "name");

                if (config) {
                  // Topic yang wajib diisi
                  const topicMandatory: any[] = config.callsheet.topicMandatory;
                  if (topicMandatory.length > 0) {
                    let notValidMandatory: any[] = [];
                    for (const item of topicMandatory) {
                      let cekData = await NotesModel.findOne(
                        {
                          $and: [
                            { "doc._id": new ObjectId(req.params.id) },
                            { "doc.type": "callsheet" },
                            { topic: item._id },
                          ],
                        },
                        { _id: 1 }
                      );

                      if (!cekData) {
                        notValidMandatory.push(item.name);
                      }
                    }
                    if (notValidMandatory.length > 0) {
                      return res.status(400).json({
                        status: 400,
                        msg: `Gagal, Wajib membuat catatan dengan topic ${notValidMandatory} !`,
                      });
                    }
                  }
                  // End

                  const notes: any = await NotesModel.find(
                    {
                      $and: [
                        { "doc._id": new ObjectId(req.params.id) },
                        { "doc.type": "callsheet" },
                      ],
                    },
                    { _id: 1, topic: 1, tags: 1 }
                  );

                  // Cek minimal catatan
                  if (notes.length < config.callsheet.notesLength) {
                    return res.status(400).json({
                      status: 400,
                      msg: `Gagal, Catatan wajib diisi minimal ${config.callsheet.notesLength} catatan!`,
                    });
                  }
                  // End

                  //  Cek tag per topic
                  if (notes.length > 0) {
                    const mergedData: any = {};
                    notes.forEach((item: any) => {
                      const topicId = item.topic.toString(); // Mengonversi ObjectId menjadi string
                      if (!mergedData[topicId]) {
                        mergedData[topicId] = {
                          _id: item.topic, // Menggunakan _id dari topic sebagai referensi
                          topic: item.topic,
                          tags: [],
                        };
                      }
                      mergedData[topicId].tags.push(...item.tags); // Menggabungkan nilai tags
                    });
                    const allNotes: any = Object.values(mergedData);

                    for (const note of allNotes) {
                      let topic: any = await TopicModel.findById(note.topic, [
                        "tags.mandatory",
                        "name",
                      ]).populate("tags.mandatory", "name");

                      if (topic.tags.mandatory.length > 0) {
                        {
                          const noteTags: String[] = note.tags.map(
                            (item: String) => item.toString()
                          );

                          const cekNotValid = topic.tags.mandatory
                            .filter((item: any) => {
                              return (
                                noteTags.indexOf(item._id.toString()) === -1
                              );
                            })
                            .map((nv: any) => nv.name);

                          if (cekNotValid.length > 0) {
                            return res.status(400).json({
                              status: 400,
                              msg: `Tag ${cekNotValid} wajib diisi di dalam topic ${topic.name}!`,
                            });
                          }
                        }
                      }
                    }
                  }

                  // End

                  // Cek mandatory tag
                  const tagMandatory: any[] = config.callsheet.tagsMandatory;
                  if (tagMandatory.length > 0) {
                    let notValidMandatory: any[] = [];
                    for (const item of tagMandatory) {
                      let cekData = await CallSheetNoteModel.findOne(
                        {
                          $and: [
                            { callsheet: new ObjectId(req.params.id) },
                            { tags: item._id },
                          ],
                        },
                        { _id: 1 }
                      );

                      if (!cekData) {
                        notValidMandatory.push(item.name);
                      }
                    }
                    if (notValidMandatory.length > 0) {
                      return res.status(400).json({
                        status: 400,
                        msg: `Gagal, Tags ${notValidMandatory} wajib digunakan!`,
                      });
                    }
                  }

                  // End
                }
                //End

                const getTaskNotes: any = await this.CheckNotes(
                  result.customer._id,
                  req.userId
                );
                if (getTaskNotes.length > 0) {
                  checkedWorkflow.data.taskNotes = getTaskNotes;

                  const schedulelist: any[] = getTaskNotes
                    .filter((item: any) => {
                      return item.from === "Schedule";
                    })
                    .map((i: any) => i._id);

                  if (schedulelist.length > 0) {
                    checkedWorkflow.data.schedulelist = schedulelist;
                    // Update status relasi schedulelist
                    try {
                      await ScheduleListModel.updateMany(
                        {
                          _id: { $in: schedulelist },
                        },
                        {
                          status: 1,
                          closing: {
                            date: new Date(),
                            user: new ObjectId(req.userId),
                            doc: {
                              _id: req.params.id,
                              name: result.name,
                              type: "callsheet",
                            },
                          },
                        }
                      );
                    } catch (error) {
                      throw error;
                    }
                    // End
                  }
                }
              }

              if (result.status !== "0" && checkedWorkflow.data.status !== 1) {
                if (result.schedulelist.length > 0) {
                  const schedule = result.schedulelist;
                  const getSchedule: any = await ScheduleListModel.find(
                    {
                      _id: { $in: schedule },
                    },
                    { _id: 1, schedule: 1 }
                  ).populate("schedule", "name status");
                  if (getSchedule.length > 0) {
                    const cekStatusSchedule = getSchedule
                      .filter((item: any) => {
                        return item.schedule.status != "1";
                      })
                      .map((i: any) => i.schedule.name);
                    if (cekStatusSchedule.length > 0) {
                      return res.status(400).json({
                        status: 400,
                        msg: `Gagal, schedule ${cekStatusSchedule} tidak aktif!`,
                      });
                    }
                  }

                  //  Hapus relasi
                  try {
                    await ScheduleListModel.updateMany(
                      {
                        _id: { $in: result.schedulelist },
                      },
                      { $unset: { closing: 1 }, status: 0 }
                    );
                  } catch (error) {
                    throw error;
                  }
                  // End

                  checkedWorkflow.data["$unset"] = {
                    schedulelist: 1,
                    taskNotes: 1,
                  };

                  // Hapus relasi schedulelist dan hapus shedulelist
                } else {
                  checkedWorkflow.data["$unset"] = { taskNotes: 1 };
                }
              }

              await Db.updateOne({ _id: req.params.id }, checkedWorkflow.data);
            }
          } else {
            return res
              .status(403)
              .json({ status: 403, msg: checkedWorkflow.msg });
          }
        } else {
          await Db.updateOne({ _id: req.params.id }, req.body);
        }

        // Update note jika customer diganti
        if (req.body.customer) {
          if (req.body.customer !== `${result.customer._id}`) {
            await NotesModel.updateMany(
              {
                $and: [
                  { "doc.type": "callsheet" },
                  { "doc._id": new ObjectId(req.params.id) },
                ],
              },
              {
                customer: new ObjectId(req.body.customer),
              }
            );
          }
        }
        // End

        const getData: any = await Db.findOne({
          _id: req.params.id,
        })
          .populate("customer", "name")
          .populate("contact", "name")
          .populate("createdBy", "name");

        const resultUpdate: any = await Db.aggregate([
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
              from: "contacts",
              localField: "contact",
              foreignField: "_id",
              as: "contact",
            },
          },
          {
            $unwind: {
              path: "$contact",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "schedulelists",
              localField: "schedulelist",
              foreignField: "_id",
              as: "schedulelist",
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
                    "schedule.notes": 1,
                    "schedule.closingDate": 1,
                  },
                },
              ],
            },
          },

          {
            $project: {
              _id: 1,
              name: 1,
              type: 1,
              status: 1,
              workflowState: 1,
              "schedulelist._id": 1,
              "schedulelist.schedule": 1,
              "schedulelist.notes": 1,
              "contact._id": 1,
              "contact.name": 1,
              "contact.phone": 1,
              "contact.position": 1,
              "customer._id": 1,
              "customer.name": 1,
              "createdBy._id": 1,
              "createdBy.name": 1,
              "customerGroup._id": 1,
              "customerGroup.name": 1,
              "branch._id": 1,
              "branch.name": 1,
              createdAt: 1,
              updatedAt: 1,
              rate: 1,
              taskNotes: 1,
            },
          },
        ]);

        // await Redis.client.set(
        //   `${redisName}-${req.params.id}`,
        //   JSON.stringify(resultUpdate[0]),
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
          redisName,
          ["taskNotes", "schedulelist"]
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

  delete = async (req: Request | any, res: Response): Promise<Response> => {
    try {
      let pipeline: any[] = [];

      pipeline.unshift({
        _id: new ObjectId(req.params.id),
      });

      const getData: any = await Db.findOne(
        { $and: pipeline },
        {
          customer: 1,
          customerGroup: 1,
          createdBy: 1,
          status: 1,
          schedulelist: 1,
        }
      ).populate("customer", "customerGroup branch");

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

      const cekPermission = await cekValidPermission(
        req.userId,
        {
          user: getData.createdBy,
          branch: getData.customer.branch,
          group: getData.customer.customerGroup,
          customer: getData.customer._id,
        },
        selPermissionType.CALLSHEET
      );

      if (!cekPermission) {
        return res.status(403).json({
          status: 403,
          msg: "Anda tidak mempunyai akses untuk dok ini!",
        });
      }

      // Cek Status

      if (getData.schedulelist.length > 0) {
        const schedule: any = await ScheduleListModel.find(
          {
            _id: { $in: getData.schedulelist },
          },
          { _id: 1, schedule: 1 }
        ).populate("schedule", "status name");
        if (schedule.length > 0) {
          const scheduleNotActive = schedule
            .filter((item: any) => item.schedule.status != "1")
            .map((i: any) => i.schedule.name);
          if (scheduleNotActive.length > 0) {
            return res.status(404).json({
              status: 404,
              msg: `Gagal, schedule ${scheduleNotActive} tidak aktif !`,
            });
          }
        }
      }
      // Cek Status

      // Delete Child
      await this.DeletedRelateChild(new ObjectId(req.params.id), getData);
      // End
      const result: any = await Db.deleteOne({ _id: req.params.id });

      // await Redis.client.del(`${redisName}-${req.params.id}`);
      return res.status(200).json({ status: 200, data: result });
    } catch (error) {
      return res.status(404).json({ status: 404, msg: error });
    }
  };

  protected DeletedRelateChild = async (
    id: ObjectId,
    data: any
  ): Promise<any> => {
    // hapus history
    History.deleteMany({ "document._id": id });
    // End
    // Hapus file note
    try {
      const files = await FileModel.find(
        {
          $and: [{ "doc.type": "callsheet" }, { "doc._id": id }],
        },
        ["name"]
      );
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

    try {
      await NotesModel.deleteMany({
        $and: [{ "doc.type": "callsheet" }, { "doc._id": id }],
      });
    } catch (error) {
      console.log(error);
    }
    // End

    // Hapus relasi callsheetnotes
    try {
      await CallSheetNoteModel.deleteMany({
        callsheet: id,
      });
    } catch (error) {
      throw error;
    }
    // End

    // Update schedulelist
    try {
      await ScheduleListModel.updateMany(
        {
          _id: { $in: data.schedulelist },
        },
        {
          status: 0,
          $unset: { closing: 1 },
        }
      );
    } catch (error) {
      throw error;
    }
    // End
  };
}

export default new CallsheetController();

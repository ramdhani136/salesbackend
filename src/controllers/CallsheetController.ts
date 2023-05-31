import { Request, Response } from "express";
import Redis from "../config/Redis";
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
  CallSheetNoteModel,
  ContactModel,
  CustomerModel,
  CallsheetModel as Db,
  History,
  namingSeriesModel,
} from "../models";
import { PermissionMiddleware } from "../middleware";
import {
  selPermissionAllow,
  selPermissionType,
} from "../middleware/PermissionMiddleware";
import { ObjectId } from "mongodb";
import HistoryController from "./HistoryController";
import WorkflowController from "./WorkflowController";
import { ISearch } from "../utils/FilterQuery";

const redisName = "callsheet";

// interface dataI {
//   user?: any;
//   customer?: any;
//   branch?: any;
//   group?: any;
// }

class CallsheetController implements IController {
  // protected cekValidPermission = async (
  //   userId: string,
  //   dataCheck: dataI,
  //   doc: selPermissionType
  // ): Promise<boolean> => {
  //   const ListData: any = [
  //     {
  //       documentCheck: selPermissionAllow.USER,
  //       data: dataCheck.user,
  //     },
  //     {
  //       documentCheck: selPermissionAllow.BRANCH,
  //       data: dataCheck.branch,
  //     },
  //     {
  //       documentCheck: selPermissionAllow.CUSTOMER,
  //       data: dataCheck.customer,
  //     },
  //     {
  //       documentCheck: selPermissionAllow.CUSTOMERGROUP,
  //       data: dataCheck.group,
  //     },
  //   ];

  //   for (const item of ListData) {
  //     // Mengambil rincian permission user
  //     if (item.data) {
  //       const checkData = await PermissionMiddleware.getPermission(
  //         userId,
  //         item.documentCheck,
  //         doc
  //       );

  //       if (checkData.length > 0) {
  //         const cekValid = checkData.find(
  //           (i) => i.toString() === item.data.toString()
  //         );

  //         if (!cekValid) {
  //           return false;
  //         }
  //       }
  //     }
  //     // End
  //   }

  //   return true;
  // };

  index = async (req: Request | any, res: Response): Promise<Response> => {
    const stateFilter: IStateFilter[] = [
      {
        alias: "Id",
        name: "_id",
        operator: ["=", "!=", "like", "notlike"],
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
        alias: "Type",
        name: "type",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
        isSort: true,
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
      // {
      //   alias: "CustomerName",
      //   name: "customer.name",
      //   operator: ["=", "!=", "like", "notlike"],
      //   typeOf: TypeOfState.String,
      // },
      {
        alias: "CustomerType",
        name: "customer.type",
        operator: ["=", "!=", "like", "notlike"],
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
        alias: "CreatedBy",
        name: "createdBy",
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

      let isFilter = FilterQuery.getFilter(
        notCustomer,
        stateFilter,
        undefined,
        ["customer", "schedulelist", "createdBy", "_id", "contact"]
      );

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
          $unwind: "$contact",
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
        req.query.search ||
        branchPermission.length > 0 ||
        groupPermission.length > 0
      ) {
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

        let pipeline: any = [validCustomer.data];

        if (branchPermission.length > 0) {
          pipeline.unshift({ branch: { $in: branchPermission } });
        }

        if (groupPermission.length > 0) {
          pipeline.unshift({ customerGroup: { $in: groupPermission } });
        }

        const customerData = await CustomerModel.find({ $and: pipeline }, [
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

      // Mengecek contact jika terdapat kontak untuk customer
      if (!req.body.contact) {
        return res
          .status(400)
          .json({ status: 400, msg: "Error, contact wajib diisi!" });
      }
      const contact = await ContactModel.findOne(
        {
          $and: [
            { _id: req.body.contact },
            {
              customer: req.body.customer,
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

      // End

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
        message: `${req.user} menambahkan callsheet ${response.name} `,
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
      const cache = await Redis.client.get(`${redisName}-${req.params.id}`);
      if (cache) {
        const isCache = JSON.parse(cache);

        const cekPermission = await cekValidPermission(
          req.userId,
          {
            user: isCache.createdBy._id,
            branch: isCache.branch._id,
            group: isCache.customerGroup._id,
            customer: isCache.customer._id,
          },
          selPermissionType.CALLSHEET
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
          $unwind: "$contact",
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

      const result = getData[0];

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

      const getDataPermit: any = await Db.findOne({
        $and: pipeline,
      }).populate("customer", "customerGroup branch");

      const result: any = await Db.findOne({
        $and: pipeline,
      })
        .populate("customer", "name")
        .populate("contact", "name")
        .populate("createdBy", "name");

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

      if (result) {
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

        //Mengecek Customer
        if (req.body.customer) {
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
          if (!req.boby.contact) {
            return res.status(404).json({
              status: 404,
              msg: "Error, data kontak sebelumnya tidak tersedia untuk konsumen ini, Silahkan ubah data kontak!",
            });
          }
        }
        // End

        // Mengecek contact jika terdapat kontak untuk customer
        if (req.body.contact) {
          const contact = await ContactModel.findOne(
            {
              $and: [
                { _id: req.body.contact },
                {
                  "customer._id": req.body.customer
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

          // if (contact.status !== "1") {
          //   return res.status(404).json({
          //     status: 404,
          //     msg: "Error, kontak tidak aktif!",
          //   });
          // }

          // // set contact
          // req.body.contact = contact._id;
        }
        // End

        if (req.body.nextState) {
          const checkedWorkflow =
            await WorkflowController.permissionUpdateAction(
              redisName,
              req.userId,
              req.body.nextState,
              result.createdBy
            );

          if (checkedWorkflow.status) {
            await Db.updateOne({ _id: req.params.id }, checkedWorkflow.data);
          } else {
            return res
              .status(403)
              .json({ status: 403, msg: checkedWorkflow.msg });
          }
        } else {
          await Db.updateOne({ _id: req.params.id }, req.body);
        }

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
            $unwind: "$contact",
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

        // push history semua field yang di update
        await HistoryController.pushUpdateMany(
          result,
          getData,
          req.user,
          req.userId,
          redisName
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

      const getData: any = await Db.findOne({ $and: pipeline }).populate(
        "customer",
        "customerGroup branch"
      );

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

      const result: any = await Db.deleteOne({ _id: req.params.id });

      await Redis.client.del(`${redisName}-${req.params.id}`);
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
      await CallSheetNoteModel.deleteMany({
        callsheet: id,
      });
    } catch (error) {
      throw error;
    }
  };
}

export default new CallsheetController();

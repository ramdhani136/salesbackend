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
  ConfigModel,
  ContactModel,
  CustomerModel,
  visitModel as Db,
  FileModel,
  History,
  NotesModel,
  ScheduleListModel,
  TopicModel,
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
import sharp from "sharp";
import path from "path";
import fs from "fs";
import { ISearch } from "../utils/FilterQuery";
import CustomerController from "./CustomerController";
import { GetNameLocation } from "../utils/GetNameLocation";
import CallsheetController from "./CallsheetController";
import { getDistance } from "geolib";

const redisName = "visit";

class VistController implements IController {
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
        alias: "CheckInAt",
        name: "checkIn.createdAt",
        operator: ["=", "!=", "like", "notlike", ">", "<", ">=", "<="],
        typeOf: TypeOfState.Date,
        isSort: true,
      },
      {
        alias: "ChecOutAt",
        name: "checkOut.createdAt",
        operator: ["=", "!=", "like", "notlike", ">", "<", ">=", "<="],
        typeOf: TypeOfState.Date,
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
            "contact.position",
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
            "checkIn",
            "checkOut",
          ];
      const order_by: any = req.query.order_by
        ? JSON.parse(`${req.query.order_by}`)
        : { updatedAt: -1 };
      ``;
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
        selPermissionType.VISIT
      );
      // End

      // Mengambil rincian permission customer
      const customerPermission = await PermissionMiddleware.getPermission(
        req.userId,
        selPermissionAllow.CUSTOMER,
        selPermissionType.VISIT
      );
      // End

      // Mengambil rincian permission group
      const groupPermission = await PermissionMiddleware.getPermission(
        req.userId,
        selPermissionAllow.CUSTOMERGROUP,
        selPermissionType.VISIT
      );
      // End

      // Mengambil rincian permission branch
      const branchPermission = await PermissionMiddleware.getPermission(
        req.userId,
        selPermissionAllow.BRANCH,
        selPermissionType.VISIT
      );
      // End

      if (!isFilter.status) {
        return res
          .status(400)
          .json({ status: 400, msg: "Error, Filter Invalid " });
      }
      // End

      let pipelineTotal: any[] = [isFilter.data];

      let pipeline: any[] = [
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
        // {
        //   $unwind: "$contact",
        // },
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
          return res.status(404).json({
            status: 404,
            msg: "Data Not found!",
          });
        }
      }

      // End

      // Cek permission customer
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
      return res.status(404).json({
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
      if (req.body.type !== "insite" && req.body.type !== "outsite") {
        return res
          .status(400)
          .json({ status: 400, msg: "Error, pilih insite atau outsite !" });
      }
    }

    if (!req.body.checkInLat) {
      return res
        .status(400)
        .json({ status: 400, msg: "Error, checkInLat  wajib diisi!" });
    }

    if (!req.body.checkInLng) {
      return res
        .status(400)
        .json({ status: 400, msg: "Error, checkInLng  wajib diisi!" });
    }

    try {
      // End

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
        $and: [{ _id: req.body.namingSeries }, { doc: "visit" }],
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

      const visit = await Db.findOne({
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

      if (visit) {
        latest = parseInt(
          `${visit.name.slice(ambilIndex ? -ambilIndex.length : -4)}`
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

      // Cek lokasi ketika type insite
      if (req.body.type === "insite") {
        // const configVisit: any = await ConfigModel.findOne({}, { visit: 1 });
        // const inLocation: any = await CustomerController.getLocatonNearby({
        //   lat: req.body.checkInLat,
        //   lng: req.body.checkInLng,
        //   maxDistance: req.body.maxDistance
        //     ? parseInt(`${req.body.maxDistance}`)
        //     : configVisit.visit.checkInDistance,
        //   customerId: new ObjectId(req.body.customer),
        //   withNoLocation: true,
        // });

        // if (inLocation.length === 0) {
        //   return res.status(400).json({
        //     status: 400,
        //     msg: `Error, Lokasi anda berada diluar area ${cekCustomer.name}!`,
        //   });
        // }

        // if (!inLocation.location) {
        req.body.location = {
          type: "Point",
          coordinates: [req.body.checkInLng, req.body.checkInLat],
          // };
        };
      }

      // Mengecek contact jika terdapat kontak untuk customer tersebut
      // if (!req.body.contact) {
      //   return res
      //     .status(400)
      //     .json({ status: 400, msg: "Error, contact wajib diisi!" });
      // }

      if (req.body.contact) {
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
      }

      // End

      req.body.createdBy = req.userId;

      // // Menset img ketika terdapat gambar
      // if (req.body.type === "outsite") {
      //   if (!req.file) {
      //     return res.status(404).json({
      //       status: 404,
      //       msg: "Error, img wajib diisi!",
      //     });
      //   }
      // }
      // // End

      const getLocation: any = await GetNameLocation({
        lat: parseFloat(req.body.checkInLat),
        lng: parseFloat(req.body.checkInLng),
      });

      req.body.checkIn = {
        lat: parseFloat(req.body.checkInLat),
        lng: parseFloat(req.body.checkInLng),
        createdAt: new Date(),
        address: getLocation.data.display_name,
      };

      const result = new Db(req.body);
      const response: any = await result.save({});

      if (req.body.location) {
        await CustomerModel.updateOne(
          { _id: new ObjectId(req.body.customer) },
          { location: req.body.location }
        );
      }

      // // Upload data ketika outsite
      // if (req.body.type === "outsite") {
      //   const compressedImage = path.join(
      //     __dirname,
      //     "../public/images",
      //     response._id + ".jpg"
      //   );
      //   sharp(req.file.path)
      //     .resize(640, 480, {
      //       fit: sharp.fit.inside,
      //       withoutEnlargement: true,
      //     })
      //     .jpeg({
      //       quality: 100,
      //       progressive: true,
      //       chromaSubsampling: "4:4:4",
      //     })
      //     .withMetadata()
      //     .toFile(compressedImage, async (err, info): Promise<any> => {
      //       if (err) {
      //         console.log(err);
      //       } else {
      //         await Db.findByIdAndUpdate(response._id, {
      //           img: response._id + ".jpg",
      //         });
      //       }
      //     });
      // }
      // //  End

      //push history
      await HistoryController.pushHistory({
        document: {
          _id: response._id,
          name: response.name,
          type: redisName,
        },
        message: `${req.user} menambahkan visit ${response.name} `,
        user: req.userId,
      });
      //End

      return res.status(200).json({ status: 200, data: response });
    } catch (error) {
      if (req.file) {
        // Jika pembuatan visit gagal, hapus foto yang telah di-upload
        fs.unlinkSync(req.file.path);
        if (fs.existsSync(path.join(__dirname, req.file.path))) {
          fs.unlinkSync(req.file.path);
        }
        // End
      }
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
      //     selPermissionType.VISIT
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
                  "schedule.note": 1,
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
            img: 1,
            signature: 1,
            checkIn: 1,
            checkOut: 1,
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
            "customer.erpId": 1,
            "branch._id": 1,
            "branch.name": 1,
            createdAt: 1,
            updatedAt: 1,
            rate: 1,
            taskNotes: 1,
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
          user: result.createdBy._id,
          branch: result.branch._id,
          group: result.customerGroup._id,
          customer: result.customer._id,
        },
        selPermissionType.VISIT
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
        const getTaskNotes: any = await CallsheetController.CheckNotes(
          result.customer._id,
          req.userId,
          "visit"
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
    if (req.body.img) {
      return res.status(404).json({
        status: 404,
        msg: "Error, Tidak dapat merubah img name!",
      });
    }
    if (req.body.status) {
      return res.status(404).json({
        status: 404,
        msg: "Error, status tidak dapat dirubah",
      });
    }
    if (req.body.workflowState) {
      return res.status(404).json({
        status: 404,
        msg: "Error, workflowState tidak dapat dirubah",
      });
    }
    if (req.body.checkIn) {
      return res.status(404).json({
        status: 404,
        msg: "Error,  CheckIn tidak dapat dirubah",
      });
    }

    // End

    try {
      const current = await Db.aggregate([
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
            pipeline: [{ $project: { name: 1 } }],
          },
        },
        {
          $unwind: "$customer",
        },

        {
          $lookup: {
            from: "contacts",
            localField: "contact",
            foreignField: "_id",
            as: "contact",
            pipeline: [{ $project: { name: 1 } }],
          },
        },
        {
          $unwind: {
            path: "$contact",
            preserveNullAndEmptyArrays: true,
          },
        },
      ]);

      const result = current[0];

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
          if (req.body.contact) {
            return res.status(404).json({
              status: 404,
              msg: "Error, Gagal merubah customer, status dokumen bukan draft",
            });
          }
          if (req.body.signature) {
            return res.status(404).json({
              status: 404,
              msg: "Error, Gagal merubah signature, status dokumen bukan draft",
            });
          }

          if (req.body.checkOut) {
            return res.status(404).json({
              status: 404,
              msg: "Error, Gagal merubah checkOut, status dokumen bukan draft",
            });
          }
        }

        if (req.file && result.type === "outsite") {
          req.body.img = req.params.id + ".jpg";
          const compressedImage = path.join(
            __dirname,
            "../public/images",
            req.params.id + ".jpg"
          );
          sharp(req.file.path)
            .resize(640, 480, {
              fit: sharp.fit.inside,
              withoutEnlargement: true,
            })
            .jpeg({
              quality: 100,
              progressive: true,
              chromaSubsampling: "4:4:4",
            })
            .withMetadata()
            .toFile(compressedImage, async (err, info): Promise<any> => {
              if (err) {
                console.log(err);
              } else {
                console.log("suksess");

                // await Db.findByIdAndUpdate(req.params.id, {
                //   img: req.params.id + ".jpg",
                // });
              }
            });
        }

        const getDataPermit: any = await Db.findOne(
          {
            _id: new ObjectId(req.params.id),
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
          selPermissionType.VISIT
        );
        if (!cekPermission) {
          return res.status(403).json({
            status: 403,
            msg: "Anda tidak mempunyai akses untuk dok ini!",
          });
        }

        // Type dirubah
        if (req.body.type) {
          if (req.body.type !== "insite" && req.body.type !== "outsite") {
            return res
              .status(400)
              .json({ status: 400, msg: "Error, pilih insite atau outsite !" });
          }

          if (req.body.type !== result.type) {
            if (req.body.type === "outsite") {
              if (!req.file) {
                return res.status(404).json({
                  status: 404,
                  msg: "Error, img wajib diisi!",
                });
              }
            } else {
              req.body.img = "";
            }
          }
        }
        // End

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
          req.body.customerName = cekCustomer.name;

          if (!req.body.contact) {
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
        }
        // End

        // Jika Checkout
        if (req.body.checkOutLat && req.body.checkOutLng) {
          if (!result.img && result.type === "outsite") {
            return res.status(404).json({
              status: 404,
              msg: "Error, Wajib melakukan foto, karena kunjungan outsite!",
            });
          }

          if (!req.body.signature && !result.signature) {
            return res.status(404).json({
              status: 404,
              msg: "Error, signature wajib diisi sebelum melakukan checkout!!",
            });
          }

          const distance = getDistance(
            { latitude: result.checkIn.lat, longitude: result.checkIn.lng },
            {
              latitude: parseFloat(req.body.checkOutLat),
              longitude: parseFloat(req.body.checkOutLng),
            }
          );

          const configVisit: any = await ConfigModel.findOne({}, { visit: 1 });

          let maxDistance = 50;
          if (configVisit) {
            maxDistance = configVisit.visit.checkOutDistance;
          }

          if (distance > maxDistance) {
            return res.status(400).json({
              status: 400,
              msg: `Gagal Checkout, Lokasi anda lebih dari ${maxDistance} Meter dari lokasi checkIn !`,
            });
          }

          const getLocation: any = await GetNameLocation({
            lat: parseFloat(req.body.checkOutLat),
            lng: parseFloat(req.body.checkOutLng),
          });

          if (getLocation) {
            req.body.checkOut = {
              lat: parseFloat(req.body.checkOutLat),
              lng: parseFloat(req.body.checkOutLng),
              createdAt: new Date(),
              address: getLocation.data.display_name,
            };
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
                // Cek gambar wajib jika type outsite
                if (!result.img && result.type === "outsite") {
                  return res.status(404).json({
                    status: 404,
                    msg: "Error, Wajib melakukan foto, karena kunjungan outsite!",
                  });
                }
                // End

                // Cek Contact
                if (!req.body.contact && !result.contact) {
                  return res.status(400).json({
                    status: 400,
                    msg: `Gagal, wajib mengisi contact !`,
                  });
                }

                // End
                // Cek apakah sudah checkout
                if (!result.checkOut) {
                  return res.status(400).json({
                    status: 400,
                    msg: "Gagal, Belum melakukan checkout kunjungan ini!",
                  });
                }

                // End
                // Cek config visit
                const config: any = await ConfigModel.findOne({}, { visit: 1 })
                  .populate("visit.tagsMandatory", "name")
                  .populate("visit.topicMandatory", "name");

                if (config) {
                  // Topic yang wajib diisi
                  const topicMandatory: any[] = config.visit.topicMandatory;
                  if (topicMandatory.length > 0) {
                    let notValidMandatory: any[] = [];
                    for (const item of topicMandatory) {
                      let cekData = await NotesModel.findOne(
                        {
                          $and: [
                            { "doc._id": new ObjectId(req.params.id) },
                            { "doc.type": "visit" },
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
                        { "doc.type": "visit" },
                      ],
                    },
                    { _id: 1, topic: 1, tags: 1 }
                  );

                  // Cek minimal catatan

                  if (notes.length < config.visit.notesLength) {
                    return res.status(400).json({
                      status: 400,
                      msg: `Gagal, Catatan wajib diisi minimal ${config.visit.notesLength} catatan!`,
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
                  const tagMandatory: any[] = config.visit.tagsMandatory;
                  if (tagMandatory.length > 0) {
                    let notValidMandatory: any[] = [];
                    for (const item of tagMandatory) {
                      let cekData = await NotesModel.findOne(
                        {
                          $and: [
                            { "doc._id": new ObjectId(req.params.id) },
                            { "doc.type": "visit" },
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

                  // End
                }

                const getTaskNotes: any = await CallsheetController.CheckNotes(
                  result.customer._id,
                  req.userId,
                  "visit"
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
                            user: req.userId,
                            doc: {
                              _id: req.params.id,
                              name: result.name,
                              type: "visit",
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
                        msg: `Gagal, schedule ${cekStatusSchedule} tidak active !`,
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
          await Db.updateOne({ _id: new ObjectId(req.params.id) }, req.body);
        }

        const updateData = await Db.aggregate([
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
              pipeline: [{ $project: { name: 1 } }],
            },
          },
          {
            $unwind: "$customer",
          },

          {
            $lookup: {
              from: "contacts",
              localField: "contact",
              foreignField: "_id",
              as: "contact",
              pipeline: [{ $project: { name: 1 } }],
            },
          },
          {
            $unwind: {
              path: "$contact",
              preserveNullAndEmptyArrays: true,
            },
          },
        ]);

        const getData = updateData[0];

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
                    "schedule.note": 1,
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
              img: 1,
              signature: 1,
              checkIn: 1,
              checkOut: 1,
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
          { _doc: result },
          getData,
          req.user,
          req.userId,
          redisName,
          ["taskNotes", "schedulelist"]
        );

        // End

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
      const getData: any = await Db.findOne(
        { _id: req.params.id },
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
        selPermissionType.VISIT
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
      if (
        fs.existsSync(path.join(__dirname, "../public/images/" + getData.img))
      ) {
        fs.unlink(
          path.join(__dirname, "../public/images/" + getData.img),
          function (err) {
            if (err && err.code == "ENOENT") {
              // file doens't exist
              console.log(err);
            } else if (err) {
              // other errors, e.g. maybe we don't have enough permission
              console.log("Error occurred while trying to remove file");
            } else {
              console.log(`removed`);
            }
          }
        );
      }

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
    // Hapus file note
    try {
      const files = await FileModel.find(
        {
          $and: [{ "doc.type": "visit" }, { "doc._id": id }],
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
        $and: [{ "doc.type": "visit" }, { "doc._id": id }],
      });
    } catch (error) {
      console.log(error);
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

export default new VistController();

import { Request, Response } from "express";
import Redis from "../config/Redis";
import { IStateFilter } from "../Interfaces";
import {
  CekKarakterSama,
  FilterQuery,
  HapusKarakter,
  PaddyData,
} from "../utils";
import IController from "./ControllerInterface";
import { TypeOfState } from "../Interfaces/FilterInterface";
import {
  ContactModel,
  CustomerModel,
  visitModel as Db,
  History,
  VisitNoteModel,
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
import fs from "fs";
import sharp from "sharp";
import path from "path";
import { ISearch } from "../utils/FilterQuery";

const redisName = "visit";

class VistController implements IController {
  index = async (req: Request | any, res: Response): Promise<Response> => {
    const stateFilter: IStateFilter[] = [
      {
        name: "_id",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
      },
      {
        name: "name",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
      },
      {
        name: "type",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
      },
      {
        name: "schedule",
        operator: ["=", "!="],
        typeOf: TypeOfState.String,
      },
      {
        name: "contact",
        operator: ["=", "!="],
        typeOf: TypeOfState.String,
      },
      {
        name: "customer",
        operator: ["=", "!="],
        typeOf: TypeOfState.String,
      },
      {
        name: "customer.name",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
      },
      {
        name: "customer.type",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
      },
      {
        name: "customer.customerGroup",
        operator: ["=", "!="],
        typeOf: TypeOfState.String,
      },
      {
        name: "customer.branch",
        operator: ["=", "!="],
        typeOf: TypeOfState.String,
      },
      {
        name: "createdBy",
        operator: ["=", "!="],
        typeOf: TypeOfState.String,
      },
      {
        name: "status",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
      },
      {
        name: "workflowState",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
      },

      {
        name: "updatedAt",
        operator: ["=", "!=", "like", "notlike", ">", "<", ">=", "<="],
        typeOf: TypeOfState.Date,
      },
      {
        name: "createdAt",
        operator: ["=", "!=", "like", "notlike", ">", "<", ">=", "<="],
        typeOf: TypeOfState.Date,
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
            "schedules._id",
            "schedules.name",
            "rate",
            "checkIn",
            "checkOut",
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
        ["customer", "schedule", "createdBy", "_id", "contact"]
      );

      // Mengambil rincian permission user
      const userPermission = await PermissionMiddleware.getPermission(
        req.userId,
        selPermissionAllow.USER,
        selPermissionType.VISIT
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
            localField: "schedule",
            foreignField: "_id",
            as: "schedules",
          },
        },
        {
          $lookup: {
            from: "schedules",
            localField: "schedules.schedule",
            foreignField: "_id",
            as: "schedules",
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
    if (!req.body.checkAddress) {
      return res
        .status(400)
        .json({ status: 400, msg: "Error, checkAddress  wajib diisi!" });
    }

    req.body.checkIn = {
      lat: parseFloat(req.body.checkInLat),
      lng: parseFloat(req.body.checkInLng),
      createdAt: new Date(),
      address: req.body.checkAddress,
    };

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

      // Mengecek contact jika terdapat kontak untuk customer tersebut
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

      // Menset img ketika terdapat gambar
      if (req.body.type === "outsite") {
        if (!req.file) {
          return res.status(404).json({
            status: 404,
            msg: "Error, img wajib diisi!",
          });
        }
      }
      // End

      const result = new Db(req.body);
      const response: any = await result.save({});

      // Upload data ketika outsite
      if (req.body.type === "outsite") {
        const compressedImage = path.join(
          __dirname,
          "../public/images",
          response._id + ".jpg"
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
              await Db.findByIdAndUpdate(response._id, {
                img: response._id + ".jpg",
              });
            }
          });
      }
      // End

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
      // const result: any = await Db.findOne({
      //   _id: req.params.id,
      // });

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
          $unwind: "$contact",
        },
        {
          $lookup: {
            from: "schedulelists",
            localField: "schedule",
            foreignField: "_id",
            as: "schedules",
          },
        },
        {
          $lookup: {
            from: "schedules",
            localField: "schedules.schedule",
            foreignField: "_id",
            as: "schedules",
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
            "schedules._id": 1,
            "schedules.name": 1,
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
      const result: any = await Db.findOne({
        _id: req.params.id,
      })
        .populate("customer", "name")
        .populate("contact", "name")
        .populate("createdBy", "name");

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

          // set contact
          req.body.contact = contact._id;
        }
        // End

        if (
          req.body.checkOut &&
          (!req.body.checkOutLat ||
            !req.body.checkOutLng ||
            !req.body.checkOutAddress)
        ) {
          return res.status(404).json({
            status: 404,
            msg: "Error, silahkan isi parameter checkOutLat,checkOutLng,checkOutAddres untuk melakukan checkout!",
          });
        }

        // Jika Checkout
        if (
          req.body.checkOutLat &&
          req.body.checkOutLng &&
          req.body.checkOutAddress
        ) {
          if (!req.body.signature && !result.signature) {
            return res.status(404).json({
              status: 404,
              msg: "Error, signature wajib diisi sebelum melakukan checkout!!",
            });
          }

          // Cek lokasi dulu apabila type insite maka checkout harus dilakukan di posisi konsumen tersebut

          req.body.checkOut = {
            lat: parseFloat(req.body.checkOutLat),
            lng: parseFloat(req.body.checkOutLng),
            createdAt: new Date(),
            address: req.body.checkOutAddress,
          };
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
            await Db.updateOne({ _id: req.params.id }, checkedWorkflow.data);
          } else {
            return res
              .status(403)
              .json({ status: 403, msg: checkedWorkflow.msg });
          }
        } else {
          await Db.updateOne({ _id: req.params.id }, req.body);
        }

        if (req.body.type) {
          // Cek bila ada perubahan type
          if (req.body.type !== result.type) {
            if (req.body.type === "outsite") {
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
                    await Db.findByIdAndUpdate(req.params.id, {
                      img: req.params.id + ".jpg",
                    });
                  }
                });
            } else {
              if (
                fs.existsSync(
                  path.join(__dirname, "../public/images/" + result.img)
                )
              ) {
                fs.unlink(
                  path.join(__dirname, "../public/images/" + result.img),
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
            }
          }

          // End
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
              localField: "schedule",
              foreignField: "_id",
              as: "schedules",
            },
          },
          {
            $lookup: {
              from: "schedules",
              localField: "schedules.schedule",
              foreignField: "_id",
              as: "schedules",
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
              "schedules._id": 1,
              "schedules.name": 1,
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

        // // Ubah semua yang terelasi
        // await this.updateRelatedData(req.params.id, getData);
        // // End

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
      await Redis.client.del(`${redisName}-${req.params.id}`);
      return res.status(200).json({ status: 200, data: result });
    } catch (error) {
      return res.status(404).json({ status: 404, msg: error });
    }
  };

  protected updateRelatedData = async (
    id: ObjectId,
    data: any
  ): Promise<any> => {
    try {
      // Data visitnote

      // Menghapus semua data visitnote di redis
      const visitkey = await Redis.client.keys("visitnote*");
      if (visitkey.length > 0) {
        await Redis.client.del(visitkey);
      }
      // End hapus redis

      // Update visitnote
      await VisitNoteModel.updateMany({ "visit._id": id }, { visit: data });
      // End update visitnote

      // End data visitnote
    } catch (error) {
      throw new Error("Gagal memperbarui data terkait");
    }
  };
}

export default new VistController();

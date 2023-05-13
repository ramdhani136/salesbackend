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
  CustomerGroupModel,
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
        name: "customer.name",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
      },
      {
        name: "customer.customerGroup.name",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
      },
      {
        name: "customer.customerGroup.branch.name",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
      },
      {
        name: "createdBy.name",
        operator: ["=", "!=", "like", "notlike"],
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
        name: "schedule.name",
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
            "createdBy.name",
            "updatedAt",
            "customer.name",
            "customer.customerGroup.name",
            "customer.customerGroup.branch.name",
            "status",
            "workflowState",
            "schedule",
          ];
      const order_by: any = req.query.order_by
        ? JSON.parse(`${req.query.order_by}`)
        : { updatedAt: -1 };
      const limit: number | string = parseInt(`${req.query.limit}`) || 10;
      let page: number | string = parseInt(`${req.query.page}`) || 1;
      let setField = FilterQuery.getField(fields);
      let isFilter = FilterQuery.getFilter(filters, stateFilter);

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

      const getAll = await Db.find(isFilter.data, setField).count();

      const result = await Db.find(isFilter.data, setField)
        .sort(order_by)
        .limit(limit)
        .skip(limit > 0 ? page * limit - limit : 0);

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
    if (!req.body.customer) {
      return res
        .status(400)
        .json({ status: 400, msg: "Error, customer wajib diisi!" });
    }

    if (!req.body.contact) {
      return res
        .status(400)
        .json({ status: 400, msg: "Error, contact wajib diisi!" });
    }

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

    if (!req.body.signature) {
      return res
        .status(400)
        .json({ status: 400, msg: "Error, signature wajib diisi!" });
    }

    if (!req.body.location?.lat) {
      return res
        .status(400)
        .json({ status: 400, msg: "Error, lat lokasi wajib diisi!" });
    }

    if (!req.body.location?.lng) {
      return res
        .status(400)
        .json({ status: 400, msg: "Error, lng lokasi wajib diisi!" });
    }

    // Jika ada checkout
    if (req.body.checkOut) {
      if (!req.body.checkOut.lng) {
        return res.status(400).json({
          status: 400,
          msg: "Error, lokasi lng checkout wajib diisi!",
        });
      }
      if (!req.body.checkOut.lat) {
        return res.status(400).json({
          status: 400,
          msg: "Error, lokasi lat checkout wajib diisi!",
        });
      }
      if (!req.body.checkOut.createdAt) {
        return res
          .status(400)
          .json({ status: 400, msg: "Error, waktu checkout wajib diisi!" });
      }
    }
    // End

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

      req.body.customer = {
        _id: new ObjectId(cekCustomer._id),
        name: cekCustomer.name,
        customerGroup: cekCustomer.customerGroup,
      };
      // End

      // Mengecek contact jika terdapat kontak untuk customer tersebut
      const contact = await ContactModel.findOne(
        {
          $and: [
            { _id: req.body.contact },
            {
              "customer._id": req.body.customer,
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
      req.body.contact = {
        _id: contact._id,
        name: contact.name,
        phone: contact.phone,
      };

      // End

      req.body.createdBy = {
        _id: new ObjectId(req.userId),
        name: req.user,
      };

      // Menset img ketika terdapat gambar
      if (req.body.type === "outsite") {
        if (!req.file) {
          return res.status(404).json({
            status: 404,
            msg: "Error, img wajib diisi!",
          });
        }
        req.body.img = req.body.name + ".jpg";
      }
      // End

      const result = new Db(req.body);
      const response: any = await result.save({});

      // Upload data ketika outsite
      if (req.body.type === "outsite") {
        const compressedImage = path.join(
          __dirname,
          "../public/images",
          req.body.img
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
          .toFile(compressedImage, (err, info) => {
            if (err) {
              console.log(err);
            } else {
              console.log(info);
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
      const result: any = await Db.findOne({
        _id: req.params.id,
      });

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
    if (req.body.customer) {
      if (typeof req.body.customer !== "string") {
        return res.status(404).json({
          status: 404,
          msg: "Error, Cek kembali data customer, Data harus berupa string id customer!",
        });
      }
    }
    if (req.body.contact) {
      if (typeof req.body.contact !== "string") {
        return res.status(404).json({
          status: 404,
          msg: "Error, Cek kembali data contact, Data harus berupa string id contact!",
        });
      }
    }
    if (req.body.location) {
      if (!req.body.location?.lat) {
        return res
          .status(400)
          .json({ status: 400, msg: "Error, lat lokasi wajib diisi!" });
      }

      if (!req.body.location?.lng) {
        return res
          .status(400)
          .json({ status: 400, msg: "Error, lng lokasi wajib diisi!" });
      }
    }

    // Validasi yang tidak boleh di rubah
    if (req.body.createdBy) {
      return res.status(404).json({
        status: 404,
        msg: "Error, Tidak dapat merubah data createdBy!",
      });
    }
    if (req.body.type) {
      return res.status(404).json({
        status: 404,
        msg: "Error, Tidak dapat merubah data type(insite/outsite)!",
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
    // End

    try {
      const result: any = await Db.findOne({
        _id: req.params.id,
      });

      if (result) {
        //Mengecek jika Customer Group dirubah
        if (req.body.customerGroup) {
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

          console.log(checkedWorkflow);
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

        // Ubah semua yang terelasi
        await this.updateRelatedData(req.params.id, getData);
        // End

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

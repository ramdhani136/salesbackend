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
  CallSheetNoteModel,
  ContactModel,
  CustomerModel,
  MemoModel as Db,
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

const redisName = "memo";

class MemoController implements IController {
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
        name: "display",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
      },

      {
        name: "createdBy._id",
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
        name: "activeDate",
        operator: ["=", "!=", "like", "notlike", ">", "<", ">=", "<="],
        typeOf: TypeOfState.Date,
      },
      {
        name: "closingDate",
        operator: ["=", "!=", "like", "notlike", ">", "<", ">=", "<="],
        typeOf: TypeOfState.Date,
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
            "display",
            "createdBy.name",
            "updatedAt",
            "notes",
            "img",
            "activeDate",
            "closingDate",
            "status",
            "workflowState",
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
    // Pengecekan khusus untuk tags
    if (
      !Array.isArray(req.body.display) ||
      req.body.display.some(
        (tag: any) =>
          !["visit", "callsheet", "dashboard", "alert"].includes(tag)
      )
    ) {
      return res
        .status(400)
        .json({ error: "Display harus array dengan data yang ditentukan!." });
    }

    if (!req.body.notes) {
      return res
        .status(400)
        .json({ status: 400, msg: "Error, notes wajib diisi!" });
    }

    if (!req.body.activeDate) {
      return res
        .status(400)
        .json({ status: 400, msg: "Error, activeDate wajib diisi!" });
    }
    if (!req.body.closingDate) {
      return res
        .status(400)
        .json({ status: 400, msg: "Error, closingDate wajib diisi!" });
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
        $and: [{ _id: req.body.namingSeries }, { doc: "memo" }],
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

      const memo = await Db.findOne({
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

      if (memo) {
        latest = parseInt(
          `${memo.name.slice(ambilIndex ? -ambilIndex.length : -4)}`
        );
      }

      req.body.name = ambilIndex
        ? olahKata.join("") +
          PaddyData(latest + 1, ambilIndex.length).toString()
        : olahKata.join("") + PaddyData(latest + 1, 4).toString();
      // End set name

      req.body.createdBy = {
        _id: new ObjectId(req.userId),
        name: req.user,
      };

      const result = new Db(req.body);

      const response: any = await result.save({});

      //push history
      await HistoryController.pushHistory({
        document: {
          _id: response._id,
          name: response.name,
          type: redisName,
        },
        message: `${req.user} menambahkan memo ${response.name} `,
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

          req.body.customer = {
            _id: new ObjectId(cekCustomer._id),
            name: cekCustomer.name,
            customerGroup: cekCustomer.customerGroup,
          };
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
      // Data callsheetnote

      // Menghapus semua data callsheetnote di redis
      const callsheetKey = await Redis.client.keys("callsheetnote*");
      if (callsheetKey.length > 0) {
        await Redis.client.del(callsheetKey);
      }
      // End hapus redis

      // Update callsheetnote
      await CallSheetNoteModel.updateMany(
        { "callsheet._id": id },
        { callsheet: data }
      );
      // End update callsheetnote

      // End data callsheetnote
    } catch (error) {
      throw new Error("Gagal memperbarui data terkait");
    }
  };
}

export default new MemoController();
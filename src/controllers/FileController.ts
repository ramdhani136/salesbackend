import { Request, Response } from "express";
// import Redis from "../config/Redis";
import { IStateFilter } from "../Interfaces";
import { FilterQuery } from "../utils";
import { FileModel, History, TagModel } from "../models";
import { TypeOfState } from "../Interfaces/FilterInterface";
import { HistoryController, WorkflowController } from ".";
import { ISearch } from "../utils/FilterQuery";
import path from "path";
import fs from "fs";

import { ObjectId } from "mongodb";

const Db = FileModel;
const redisName = "files";

class TopicController {
  index = async (req: Request | any, res: Response): Promise<Response> => {
    const stateFilter: IStateFilter[] = [
      {
        alias: "Id",
        name: "_id",
        operator: ["=", "!="],
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
        alias: "Note",
        name: "note",
        operator: ["=", "!="],
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
        alias: "DocType",
        name: "doc.type",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
        isSort: true,
      },
      {
        alias: "DocId",
        name: "doc._id",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
      },
      {
        alias: "DocName",
        name: "doc._name",
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
      // Mengambil query
      const filters: any = req.query.filters
        ? JSON.parse(`${req.query.filters}`)
        : [];
      const fields: any = req.query.fields
        ? JSON.parse(`${req.query.fields}`)
        : [
            "name",
            "type",
            "doc",
            "createdBy._id",
            "createdBy.name",
            "updatedAt",
            "note",
          ];
      const order_by: any = req.query.order_by
        ? JSON.parse(`${req.query.order_by}`)
        : { updatedAt: -1 };
      const limit: number | string = parseInt(`${req.query.limit}`) || 0;
      let page: number | string = parseInt(`${req.query.page}`) || 1;
      let search: ISearch = {
        filter: ["name", "type", "doc.name", "doc.type"],
        value: req.query.search || "",
      };

      // Mengambil hasil fields
      let setField = FilterQuery.getField(fields);
      // End

      // Mengambil hasil filter
      let isFilter = FilterQuery.getFilter(filters, stateFilter, search, [
        "createdBy",
        "_id",
        "doc._id",
        "note",
      ]);
      // End

      // Validasi apakah filter valid

      if (!isFilter.status) {
        return res
          .status(400)
          .json({ status: 400, msg: "Error, Filter Invalid " });
      }

      // End

      let pipelineTotal: any = [
        {
          $match: isFilter.data,
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
          $count: "total_orders",
        },
      ];

      const totalData = await Db.aggregate(pipelineTotal);

      const getAll = totalData.length > 0 ? totalData[0].total_orders : 0;

      let pipelineResult: any = [
        {
          $sort: order_by,
        },
        {
          $match: isFilter.data,
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
          $skip: limit > 0 ? page * limit - limit : 0,
        },

        {
          $project: setField,
        },
      ];

      // Menambahkan limit ketika terdapat limit
      if (limit > 0) {
        pipelineResult.push({ $limit: limit > 0 ? limit : getAll });
      }
      // End

      const result = await Db.aggregate(pipelineResult);

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
    try {
      if (!req.file) {
        throw "Error, Tidak ada file yang dilampirkan!";
      }

      if (req.file.fieldname != "file") {
        throw "Error, field data file tidak ditemukan!";
      }

      req.body.name = req.file.filename;
      req.body.type = req.file.mimetype;
      req.body.createdBy = req.userId;

      if (!req.body.note) {
        throw "Error, note wajib diisi!";
      }

      if (!req.body.doc.type) {
        throw "Error, doc.type wajib diisi!";
      }

      if (!req.body.doc._id) {
        throw "Error, doc._id wajib diisi!";
      }
      if (!req.body.doc.name) {
        throw "Error, doc.name wajib diisi!";
      }

      const result = new Db(req.body);
      const response = await result.save();

      // push history
      await HistoryController.pushHistory({
        document: {
          _id: response._id,
          name: response.name,
          type: redisName,
        },
        message: `Membuat ${redisName} ${req.body.name} `,
        user: req.userId,
      });
      // End

      return res.status(200).json({ status: 200, data: response });
    } catch (error: any) {
      // Jika pembuatan gagal menyimpan, hapus foto yang telah di-upload
      if (
        fs.existsSync(
          path.join(__dirname, `../../build/public/files/${req.body.name}`)
        )
      ) {
        fs.unlinkSync(
          path.join(__dirname, `../../build/public/files/${req.body.name}`)
        );
      }
      // End

      return res.status(400).json({ status: 400, msg: error.errors ?? error });
    }
  };

  delete = async (req: Request | any, res: Response): Promise<Response> => {
    try {
      const result = await Db.findOne({ _id: new ObjectId(req.params.id) }, [
        "name",
      ]);

      if (!result) {
        throw "Error, Data tidak ditemukan!";
      }
      const actionDel = await Db.findOneAndDelete({ _id: req.params.id });
      // await Redis.client.del(`${redisName}-${req.params.id}`);
      // push history
      await HistoryController.pushHistory({
        document: {
          _id: result._id,
          name: result.name,
          type: redisName,
        },
        message: `Menghapus ${redisName}  ${result.name}`,
        user: req.userId,
      });
      // End

      if (
        fs.existsSync(
          path.join(__dirname, `../../build/public/files/${result.name}`)
        )
      ) {
        fs.unlinkSync(
          path.join(__dirname, `../../build/public/files/${result.name}`)
        );
      }
      return res.status(200).json({ status: 200, data: actionDel });
    } catch (error) {
      return res.status(404).json({ status: 404, msg: error });
    }
  };
}

export default new TopicController();

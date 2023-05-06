import { Request, Response } from "express";
import Redis from "../config/Redis";
import { IStateFilter } from "../Interfaces";
import { FilterQuery } from "../utils";
import IController from "./ControllerInterface";
import { TypeOfState } from "../Interfaces/FilterInterface";
import { History, RoleListModel, RoleProfileModel } from "../models";
import HistoryController from "./HistoryController";

const Db = RoleListModel;
const redisName = "rolelist";

class RoleListController implements IController {
  index = async (req: Request, res: Response): Promise<Response> => {
    const stateFilter: IStateFilter[] = [
      {
        name: "_id",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
      },
      {
        name: "roleprofile.name",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
      },
      {
        name: "createdBy.name",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
      },
      {
        name: "doc",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
      },
      {
        name: "create",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
      },
      {
        name: "read",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
      },
      {
        name: "update",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
      },
      {
        name: "delete",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
      },
      {
        name: "submit",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
      },
      {
        name: "amend",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
      },
      {
        name: "export",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
      },
      {
        name: "report",
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
            "roleprofile.name",
            "createdBy.name",
            "doc",
            "create",
            "update",
            "delete",
            "read",
            "submit",
            "amend",
            "export",
            "import",
          ];
      const order_by: any = req.query.order_by
        ? JSON.parse(`${req.query.order_by}`)
        : { updatedAt: -1 };
      const limit: number | string = parseInt(`${req.query.limit}`) || 10;
      let page: number | string = parseInt(`${req.query.page}`) || 1;
      let setField = FilterQuery.getField(fields);
      let isFilter = FilterQuery.getFilter(filters, stateFilter);

      if (!isFilter.status) {
        return res
          .status(400)
          .json({ status: 400, msg: "Error, Filter Invalid " });
      }
      // End

      let pipelineTotal: any = [
        {
          $lookup: {
            from: "roleprofiles",
            localField: "roleprofile",
            foreignField: "_id",
            as: "roleprofile",
          },
        },
        {
          $unwind: "$roleprofile",
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
          $match: isFilter.data,
        },
        {
          $project: setField,
        },
        {
          $count: "total_orders",
        },
      ];

      const totalData = await Db.aggregate(pipelineTotal);

      const getAll = totalData.length > 0 ? totalData[0].total_orders : 0;

      const pipelineResult: any = [
        {
          $sort: order_by,
        },
        {
          $lookup: {
            from: "roleprofiles",
            localField: "roleprofile",
            foreignField: "_id",
            as: "roleprofile",
          },
        },
        {
          $unwind: "$roleprofile",
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
          $match: isFilter.data,
        },
        {
          $project: setField,
        },
        {
          $skip: limit > 0 ? page * limit - limit : 0,
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
    if (!req.body.roleprofile) {
      return res
        .status(400)
        .json({ status: 400, msg: "roleprofile Required!" });
    }
    if (!req.body.doc) {
      return res.status(400).json({ status: 400, msg: "doc Required!" });
    }
    req.body.createdBy = req.userId;

    try {
      // Cek duplikat data
      const duplicate = await Db.findOne({
        $and: [
          { roleprofile: req.body.roleprofile },
          {
            doc: req.body.doc,
          },
        ],
      });
      if (duplicate) {
        return res
          .status(404)
          .json({ status: 404, msg: "Error, duplikasi data!" });
      }
      // End

      //Mengecek roleprofile terdaftar dan aktif
      const cekRoleValid = await RoleProfileModel.findOne({
        $and: [{ _id: req.body.roleprofile }, { status: "1" }],
      });
      if (!cekRoleValid) {
        return res
          .status(404)
          .json({ status: 404, msg: "Error, roleprofile tidak ditemukan!" });
      }
      // End

      const result = new Db(req.body);
      const response = await result.save();
      const data: any = await response.populate({
        path: "roleprofile",
        select: "name",
      });

      // push history
      await HistoryController.pushHistory({
        document: {
          _id: data._id,
          name: data.roleprofile.name,
          type: redisName,
        },
        message: `Menambahkan rolelist doc ${data.doc} pada roleprofile ${data.roleprofile.name} `,
        user: req.userId,
      });
      // End

      return res.status(200).json({ status: 200, data: data });
    } catch (error) {
      return res
        .status(400)
        .json({ status: 400, msg: error ?? "Error Connection!" });
    }
  };

  show = async (req: Request, res: Response): Promise<Response> => {
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
      const result: any = await Db.findOne({ _id: req.params.id })
        .populate("roleprofile", "name")
        .populate("createdBy", "name");

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
    try {
      const result = await Db.findById(req.params.id)
        .populate("roleprofile", "name")
        .populate("createdBy", "name");
      if (result) {
        //Mengecek roleprofile terdaftar dan aktif
        if (req.body.roleprofile) {
          const cekRoleValid = await RoleProfileModel.findOne({
            $and: [{ _id: req.body.roleprofile }, { status: "1" }],
          });
          if (!cekRoleValid) {
            return res.status(404).json({
              status: 404,
              msg: "Error, roleprofile tidak di temukan!",
            });
          }
        }
        // End

        // Cek duplikat data
        if (req.body.roleprofile || req.body.doc) {
          const duplicate = await Db.findOne({
            $and: [
              {
                roleprofile: req.body.roleprofile
                  ? req.body.roleprofile
                  : result.roleprofile._id,
              },
              {
                doc: req.body.doc ? req.body.doc : result.doc,
              },
              {
                _id: { $ne: req.params.id },
              },
            ],
          });
          if (duplicate) {
            return res
              .status(404)
              .json({ status: 404, msg: "Error, duplikasi data!" });
          }
        }
        // End

        await Db.updateOne({ _id: req.params.id }, req.body);
        const data: any = await Db.findOne({ _id: req.params.id })
          .populate("roleprofile", "name")
          .populate("createdBy", "name");

        // Push history semua field yang di update
        await HistoryController.pushUpdateMany(
          result,
          data,
          req.user,
          req.userId,
          redisName
        );
        // End

        await Redis.client.set(
          `${redisName}-${req.params.id}`,
          JSON.stringify(data)
        );

        return res.status(200).json({ status: 200, data: data });
      }
      return res
        .status(400)
        .json({ status: 404, msg: "Error update, data not found" });
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

export default new RoleListController();

import { Request, Response } from "express";
// import Redis from "../config/Redis";
import { IStateFilter } from "../Interfaces";
import { CekKarakterSama, FilterQuery, HapusKarakter, PaddyData } from "../utils";
import IController from "./ControllerInterface";
import { AssesmentSchedule, AssesmentTemplate, History, PermissionModel, namingSeriesModel } from "../models";
import { TypeOfState } from "../Interfaces/FilterInterface";
import { HistoryController, WorkflowController } from ".";
import { ISearch } from "../utils/FilterQuery";
import { PermissionMiddleware } from "../middleware";
import {
  selPermissionAllow,
  selPermissionType,
} from "../middleware/PermissionMiddleware";
import { ObjectId } from 'bson';

const Db = AssesmentSchedule;
const redisName = "assesmentschedule";

class AssesmentScheduleController implements IController {
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
        alias: "CreatedBy",
        name: "createdBy._id",
        operator: ["=", "!="],
        typeOf: TypeOfState.String,
      },
      {
        alias: "Status",
        name: "status",
        operator: ["=", "!=",],
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
      // Mengambil query
      const filters: any = req.query.filters
        ? JSON.parse(`${req.query.filters}`)
        : [];
      const fields: any = req.query.fields
        ? JSON.parse(`${req.query.fields}`)
        : [
          "name",
          "lat",
          "lng",
          "desc",
          "workflowState",
          "createdBy.name",
          "status",
          "updatedAt",
        ];
      const order_by: any = req.query.order_by
        ? JSON.parse(`${req.query.order_by}`)
        : { updatedAt: -1 };
      const limit: number | string = parseInt(`${req.query.limit}`) || 0;
      let page: number | string = parseInt(`${req.query.page}`) || 1;
      let search: ISearch = {
        filter: ["name", "workflowState"],
        value: req.query.search || "",
      };

      // Mengecek permission user
      const userPermission = await PermissionMiddleware.getPermission(
        req.userId,
        selPermissionAllow.USER,
        selPermissionType.BRANCH
      );
      // End

      // Mengecek permission user
      const branchPermission = await PermissionMiddleware.getPermission(
        req.userId,
        selPermissionAllow.BRANCH,
        selPermissionType.BRANCH
      );
      // End

      // Mengambil hasil fields
      let setField = FilterQuery.getField(fields);
      // End

      // Mengambil hasil filter
      let isFilter = FilterQuery.getFilter(filters, stateFilter, search, [
        "createdBy",
        "_id",
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
          $project: setField,
        },
        {
          $match: isFilter.data,
        },
        {
          $count: "total_orders",
        },
      ];

      // Menambahkan filter berdasarkan permission user
      if (userPermission.length > 0) {
        pipelineTotal.unshift({
          $match: {
            createdBy: { $in: userPermission.map((id) => new ObjectId(id)) },
          },
        });
      }
      // End
      // Menambahkan filter berdasarkan permission branch
      if (branchPermission.length > 0) {
        pipelineTotal.unshift({
          $match: {
            _id: { $in: branchPermission.map((id) => new ObjectId(id)) },
          },
        });
      }
      // End

      const totalData = await Db.aggregate(pipelineTotal);

      const getAll = totalData.length > 0 ? totalData[0].total_orders : 0;

      let pipelineResult: any = [
        {
          $sort: order_by,
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
          $skip: limit > 0 ? page * limit - limit : 0,
        },

        {
          $project: setField,
        },
      ];

      // Menambahkan filter berdasarkan permission user
      if (userPermission.length > 0) {
        pipelineResult.unshift({
          $match: {
            createdBy: { $in: userPermission.map((id) => new ObjectId(id)) },
          },
        });
      }
      // End
      // Menambahkan filter berdasarkan permission branch
      if (branchPermission.length > 0) {
        pipelineResult.unshift({
          $match: {
            _id: { $in: branchPermission.map((id) => new ObjectId(id)) },
          },
        });
      }
      // End

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

      if (!req.body.activeDate) {
        return res
          .status(400)
          .json({ status: 400, msg: "Error, activeDate wajib diisi!" });
      }

      if (!req.body.deactiveDare) {
        return res
          .status(400)
          .json({ status: 400, msg: "Error, deactiveDare wajib diisi!" });
      }

      if (!req.body.assesmentTemplate) {
        return res
          .status(400)
          .json({ status: 400, msg: "Error, assesmentTemplate wajib diisi!" });
      }

      const cekTemplate = await AssesmentTemplate.findById(req.body.assesmentTemplate, ["status"])
      console.log(
        cekTemplate
      )

      // Set Naming
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
        $and: [{ _id: req.body.namingSeries }, { doc: "assesmentschedule" }],
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

      const doc = await Db.findOne({
        $and: [
          { name: { $regex: regex } },
          {
            $where: `this.name.length === ${ambilIndex ? jumlahKarakter : jumlahKarakter + 4
              }`,
          },
        ],
      })
        .sort({ createdAt: -1 })
        .exec();

      if (doc) {
        latest = parseInt(
          `${doc.name.slice(ambilIndex ? -ambilIndex.length : -4)}`
        );
      }

      req.body.name = ambilIndex
        ? olahKata.join("") +
        PaddyData(latest + 1, ambilIndex.length).toString()
        : olahKata.join("") + PaddyData(latest + 1, 4).toString();
      // End Set Naming

      req.body.createdBy = req.userId;

      // const result = new Db(req.body);
      // const response = await result.save();

      // // push history
      // await HistoryController.pushHistory({
      //   document: {
      //     _id: response._id,
      //     name: response.name,
      //     type: redisName,
      //   },
      //   message: `Membuat ${redisName} baru`,
      //   user: req.userId,
      // });
      // // End

      return res.status(200).json({ status: 200, data: 'response' });
    } catch (error) {
      return res.status(400).json({ status: 400, data: error });
    }
  };

  show = async (req: Request | any, res: Response): Promise<any> => {
    try {
      // Mengecek permission user
      const userPermission = await PermissionMiddleware.getPermission(
        req.userId,
        selPermissionAllow.USER,
        selPermissionType.BRANCH
      );
      // End

      // Mengecek permission branch
      const branchPermission = await PermissionMiddleware.getPermission(
        req.userId,
        selPermissionAllow.BRANCH,
        selPermissionType.BRANCH
      );
      // End

      // const cache = await Redis.client.get(`${redisName}-${req.params.id}`);

      // if (cache) {
      //   const isCache = JSON.parse(cache);

      //   if (userPermission.length > 0) {
      //     const validPermission = userPermission.find((item) => {
      //       return item.toString() === isCache.createdBy._id.toString();
      //     });

      //     if (!validPermission) {
      //       return res
      //         .status(404)
      //         .json({ status: 404, msg: "Data tidak ditemukan!" });
      //     }
      //   }

      //   if (branchPermission.length > 0) {
      //     const validBranchPermission = branchPermission.find((item) => {
      //       return item.toString() === isCache.createdBy._id.toString();
      //     });

      //     if (!validBranchPermission) {
      //       return res
      //         .status(404)
      //         .json({ status: 404, msg: "Data tidak ditemukan!" });
      //     }
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

      let pipeline: any = [{ _id: req.params.id }];

      if (userPermission.length > 0) {
        pipeline.push({ createdBy: { $in: userPermission } });
      }

      if (branchPermission.length > 0) {
        pipeline.push({ _id: { $in: branchPermission } });
      }

      const result: any = await Db.findOne({
        $and: pipeline,
      }).populate("createdBy", "name");

      if (!result) {
        return res
          .status(404)
          .json({ status: 404, msg: "Data tidak ditemukan!" });
      }

      const buttonActions = await WorkflowController.getButtonAction(
        redisName,
        req.userId,
        result.workflowState
      );

      // return res.send(buttonActions)
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

      // await Redis.client.set(
      //   `${redisName}-${req.params.id}`,
      //   JSON.stringify(result),
      //   {
      //     EX: 30,
      //   }
      // );

      return res.status(200).json({
        status: 200,
        data: result,
        history: getHistory,
        workflow: buttonActions,
      });
    } catch (error) {
      return res.status(404).json({ status: 404, msg: error });
    }
  };

  update = async (req: Request | any, res: Response): Promise<any> => {
    try {
      // Mengecek permission user
      const userPermission = await PermissionMiddleware.getPermission(
        req.userId,
        selPermissionAllow.USER,
        selPermissionType.BRANCH
      );
      // End
      // Mengecek permission user
      const branchPermission = await PermissionMiddleware.getPermission(
        req.userId,
        selPermissionAllow.BRANCH,
        selPermissionType.BRANCH
      );
      // End
      let pipeline: any[] = [
        {
          _id: req.params.id,
        },
      ];

      if (userPermission.length > 0) {
        pipeline.push({ createdBy: { $in: userPermission } });
      }

      if (branchPermission.length > 0) {
        pipeline.push({ _id: { $in: branchPermission } });
      }

      const result: any = await Db.findOne({
        $and: pipeline,
      }).populate("createdBy", "name");

      if (result) {
        // if (!req.body.name && !result.name) {
        //   return res
        //     .status(400)
        //     .json({ status: 400, msg: "Nama wajib diisi!" });
        // }

        if (req.body.nextState) {
          const checkedWorkflow =
            await WorkflowController.permissionUpdateAction(
              redisName,
              req.userId,
              req.body.nextState,
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
        }).populate("createdBy", "name");
        // await Redis.client.set(
        //   `${redisName}-${req.params.id}`,
        //   JSON.stringify(getData),
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

  delete = async (req: Request | any, res: Response): Promise<Response> => {
    try {
      // Mengecek permission user
      const userPermission = await PermissionMiddleware.getPermission(
        req.userId,
        selPermissionAllow.USER,
        selPermissionType.BRANCH
      );
      // End
      // Mengecek permission user
      const branchPermission = await PermissionMiddleware.getPermission(
        req.userId,
        selPermissionAllow.BRANCH,
        selPermissionType.BRANCH
      );
      // End

      let pipeline: any[] = [
        {
          _id: req.params.id,
        },
      ];

      if (userPermission.length > 0) {
        pipeline.push({ createdBy: { $in: userPermission } });
      }

      if (branchPermission.length > 0) {
        pipeline.push({ _id: { $in: branchPermission } });
      }

      const result = await Db.findOne({ $and: pipeline });

      if (!result) {
        return res
          .status(404)
          .json({ status: 404, msg: "Error, Data tidak ditemukan!" });
      }

      // Cek apakah digunakan di permission data
      const permission = await PermissionModel.findOne(
        {
          $and: [
            { allow: "branch" },
            {
              value: new ObjectId(req.params.id),
            },
          ],
        },
        { _id: 1 }
      );

      if (permission) {
        return res.status(404).json({
          status: 404,
          msg: "Branch ini sudah digunakan oleh data permission!",
        });
      }
      // End

      // if (result.status === "1") {
      //   return res
      //     .status(404)
      //     .json({ status: 404, msg: "Error, status dokumen aktif!" });
      // }

      const actionDel = await Db.findOneAndDelete({ _id: req.params.id });
      // await Redis.client.del(`${redisName}-${req.params.id}`);
      // push history
      await HistoryController.pushHistory({
        document: {
          _id: result._id,
          name: result.name,
          type: redisName,
        },
        message: `Menghapus ${redisName} nomor ${result.name}`,
        user: req.userId,
      });
      // End
      return res.status(200).json({ status: 200, data: actionDel });
    } catch (error) {
      return res.status(404).json({ status: 404, msg: error });
    }
  };
}

export default new AssesmentScheduleController();

import { Request, Response } from "express";
// import Redis from "../config/Redis";
import { IStateFilter } from "../Interfaces";
import { FilterQuery, cekValidPermission } from "../utils";
import IController from "./ControllerInterface";
import { BranchModel, History, namingSeriesModel } from "../models";
import { TypeOfState } from "../Interfaces/FilterInterface";
import { HistoryController, WorkflowController } from ".";
import { ISearch } from "../utils/FilterQuery";
import { PermissionMiddleware } from "../middleware";
import {
  selPermissionAllow,
  selPermissionType,
} from "../middleware/PermissionMiddleware";
import { ObjectId } from "mongodb";

const Db = namingSeriesModel;
const redisName = "namingseries";

class NamingSeriesController implements IController {
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
        alias: "Doc",
        name: "doc",
        operator: ["=", "!="],
        typeOf: TypeOfState.String,
        isSort: true,
      },

      {
        alias: "Branch",
        name: "branch",
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
            "doc",
            "branch._id",
            "branch.name",
            "createdAt",
            "updatedAt",
          ];
      const order_by: any = req.query.order_by
        ? JSON.parse(`${req.query.order_by}`)
        : { updatedAt: -1 };
      const limit: number | string = parseInt(`${req.query.limit}`) || 0;
      let page: number | string = parseInt(`${req.query.page}`) || 1;
      let search: ISearch = {
        filter: ["name"],
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
        "_id",
        "branch",
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
          $project: setField,
        },

        {
          $count: "total_orders",
        },
      ];

      let pipelineResult: any = [
        {
          $match: isFilter.data,
        },
        {
          $sort: order_by,
        },
        {
          $lookup: {
            from: "branches",
            localField: "branch",
            foreignField: "_id",
            as: "branch",
          },
        },

        {
          $project: setField,
        },
      ];

      if (userPermission.length > 0 || branchPermission.length > 0) {
        let branchPipeline: any = [];

        if (userPermission.length > 0) {
          branchPipeline.push({ createdBy: { $in: userPermission } });
        }

        if (branchPermission.length > 0) {
          branchPipeline.push({ _id: { $in: branchPermission } });
        }

        const branchValid = await BranchModel.find(
          { $and: branchPipeline },
          { _id: 1 }
        );

        if (branchValid.length === 0) {
          return res.status(400).json({
            status: 404,
            msg: "Data tidak ditemukan!",
          });
        }

        const finalPermission = branchValid.map((item) => {
          return item._id;
        });

        pipelineResult.unshift({
          $match: { branch: { $in: finalPermission } },
        });
        pipelineTotal.unshift({ $match: { branch: { $in: finalPermission } } });
      }

      const totalData = await Db.aggregate(pipelineTotal);
      const getAll = totalData.length > 0 ? totalData[0].total_orders : 0;
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
    if (!req.body.name) {
      return res.status(400).json({ status: 400, msg: "Name wajib diisi!" });
    }

    if (!req.body.doc) {
      return res.status(400).json({ status: 400, msg: "Doc wajib diisi!" });
    } else {
      if (
        req.body.doc !== "visit" &&
        req.body.doc !== "callsheet" &&
        req.body.doc !== "doc"
      ) {
        return res.status(400).json({
          status: 400,
          msg: "Error, hanya bisa memilih visit,callsheet,schedule!",
        });
      }
    }

    if (!req.body.branch) {
      return res.status(400).json({ status: 400, msg: "Branch wajib diisi" });
    }

    try {
      // Cek validasi branch

      // Mengecek apakah data array
      const isArray = Array.isArray(req.body.branch);
      if (!isArray) {
        return res.status(400).json({
          status: 400,
          msg: "Error, data harus berisi array!",
        });
      }
      // End

      //  Mengecek apakah branch diisi
      if (req.body.branch.length === 0) {
        return res.status(400).json({
          status: 400,
          msg: "Error, branch harus diisi!",
        });
      }
      // End

      // Cek apakah branch tersedia dan aktif
      for (const item of req.body.branch) {
        let branch: any = await BranchModel.findById(item);
        if (!branch) {
          return res.status(400).json({
            status: 400,
            msg: `Error, branch ${branch.name} tidak ditemukan!`,
          });
        }

        if (branch.status !== "1") {
          return res.status(400).json({
            status: 400,
            msg: `Error, branch ${branch.name} tidak aktif!`,
          });
        }
      }
      // End

      // End

      // Cek duplikat
      const duplc = await Db.findOne({ name: req.body.name });

      if (duplc) {
        return res.status(400).json({
          status: 400,
          msg: `Error, ${req.body.name} sudah terinput sebelumnya!`,
        });
      }
      // End

      const result = new Db(req.body);
      const response = await result.save();

      // push history
      await HistoryController.pushHistory({
        document: {
          _id: response._id,
          name: response.name,
          type: redisName,
        },
        message: `Membuat ${redisName} baru response.name `,
        user: req.userId,
      });
      // End

      // await Redis.client.set(
      //   `${redisName}-${response._id}`,
      //   JSON.stringify(response),
      //   {
      //     EX: 30,
      //   }
      // );

      return res.status(200).json({ status: 200, data: response });
    } catch (error) {
      return res.status(400).json({ status: 400, data: error });
    }
  };

  show = async (req: Request | any, res: Response): Promise<any> => {
    try {
      // const cache = await Redis.client.get(`${redisName}-${req.params.id}`);

      // if (cache) {
      //   const isCache = JSON.parse(cache);

      //   // Mengambil rincian permission user
      //   const branchPermission = await PermissionMiddleware.getPermission(
      //     req.userId,
      //     selPermissionAllow.BRANCH,
      //     selPermissionType.BRANCH
      //   );
      //   // End
      //   // Mengambil rincian permission user
      //   const userPermission = await PermissionMiddleware.getPermission(
      //     req.userId,
      //     selPermissionAllow.USER,
      //     selPermissionType.BRANCH
      //   );
      //   // End

      //   if (branchPermission.length > 0) {
      //     const data = isCache.branch;

      //     const parseString: any[] = branchPermission.map((i) => {
      //       return `${i}`;
      //     });

      //     const found = data.some((item: any) => {
      //       return parseString.includes(`${item._id}`);
      //     });

      //     if (!found) {
      //       return res.status(403).json({
      //         status: 403,
      //         msg: "Anda tidak mempunyai akses untuk dok ini!",
      //       });
      //     }
      //   }
      //   if (userPermission.length > 0) {
      //     const data = isCache.branch;

      //     const parseString: any[] = userPermission.map((i) => {
      //       return `${i}`;
      //     });

      //     const found = data.some((item: any) => {
      //       return parseString.includes(`${item.createdBy}`);
      //     });

      //     if (!found) {
      //       return res.status(403).json({
      //         status: 403,
      //         msg: "Anda tidak mempunyai akses untuk dok ini!",
      //       });
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
      const result: any = await Db.findOne({
        _id: req.params.id,
      }).populate("branch", "name createdBy");

      if (!result) {
        return res
          .status(404)
          .json({ status: 404, msg: "Error, Data tidak ditemukan!" });
      }

      // Mengambil rincian permission user
      const branchPermission = await PermissionMiddleware.getPermission(
        req.userId,
        selPermissionAllow.BRANCH,
        selPermissionType.BRANCH
      );
      // End
      // Mengambil rincian permission user
      const userPermission = await PermissionMiddleware.getPermission(
        req.userId,
        selPermissionAllow.USER,
        selPermissionType.BRANCH
      );
      // End

      if (branchPermission.length > 0) {
        const data = result.branch;

        const parseString: any[] = branchPermission.map((i) => {
          return `${i}`;
        });

        const found = data.some((item: any) => {
          return parseString.includes(`${item._id}`);
        });

        if (!found) {
          return res.status(403).json({
            status: 403,
            msg: "Anda tidak mempunyai akses untuk dok ini!",
          });
        }
      }
      if (userPermission.length > 0) {
        const data = result.branch;

        const parseString: any[] = userPermission.map((i) => {
          return `${i}`;
        });

        const found = data.some((item: any) => {
          return parseString.includes(`${item.createdBy}`);
        });

        if (!found) {
          return res.status(403).json({
            status: 403,
            msg: "Anda tidak mempunyai akses untuk dok ini!",
          });
        }
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
      const result: any = await Db.findOne({
        _id: req.params.id,
      }).populate("createdBy", "name");

      if (result) {
        if (req.body.id_workflow && req.body.id_state) {
          const checkedWorkflow =
            await WorkflowController.permissionUpdateAction(
              req.body.id_workflow,
              req.userId,
              req.body.id_state,
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
      const result = await Db.findOneAndDelete({ _id: req.params.id });
      if (result) {
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
        return res.status(200).json({ status: 200, data: result });
      }
      return res.status(404).json({ status: 404, msg: "Error Delete!" });
    } catch (error) {
      return res.status(404).json({ status: 404, msg: error });
    }
  };
}

export default new NamingSeriesController();

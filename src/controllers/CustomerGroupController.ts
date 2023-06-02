import { Request, Response } from "express";
import Redis from "../config/Redis";
import { IStateFilter } from "../Interfaces";
import { FilterQuery, cekValidPermission } from "../utils";
import IController from "./ControllerInterface";
import { TypeOfState } from "../Interfaces/FilterInterface";
import { BranchModel, CustomerGroupModel as Db, History } from "../models";
import { PermissionMiddleware } from "../middleware";
import {
  selPermissionAllow,
  selPermissionType,
} from "../middleware/PermissionMiddleware";
import { ObjectId } from "mongodb";
import HistoryController from "./HistoryController";
import WorkflowController from "./WorkflowController";
import { ISearch } from "../utils/FilterQuery";

const redisName = "customergroup";

class CustomerGroupController implements IController {
  index = async (req: Request | any, res: Response): Promise<Response> => {
    const stateFilter: IStateFilter[] = [
      {
        alias: "Id",
        name: "_id",
        operator: ["=", "!="],
        typeOf: TypeOfState.String,
      },
      {
        alias: "Parent",
        name: "parent.name",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
        isSort: true,
      },
      {
        alias: "Branch",
        name: "branch._id",
        operator: ["=", "!="],
        typeOf: TypeOfState.String,
      },
      {
        alias: "CreatedBy",
        name: "createdBy._id",
        operator: ["=", "!="],
        typeOf: TypeOfState.String,
      },
      // {
      //   name: "createdBy.name",
      //   operator: ["=", "!=", "like", "notlike"],
      //   typeOf: TypeOfState.String,
      // },
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
            "parent.name",
            "parent._id",
            "branch.name",
            "branch._id",
            "createdBy.name",
            "createdBy._id",
            "updatedAt",
          ];
      const order_by: any = req.query.order_by
        ? JSON.parse(`${req.query.order_by}`)
        : { updatedAt: -1 };
      const limit: number | string = parseInt(`${req.query.limit}`) || 0;
      let page: number | string = parseInt(`${req.query.page}`) || 1;
      let setField = FilterQuery.getField(fields);

      let search: ISearch = {
        filter: ["name"],
        value: req.query.search || "",
      };
      let isFilter = FilterQuery.getFilter(filters, stateFilter, search, [
        "createdBy._id",
        "branch._id",
        "_id",
      ]);

      // Mengambil rincian permission user
      const userPermission = await PermissionMiddleware.getPermission(
        req.userId,
        selPermissionAllow.USER,
        selPermissionType.CUSTOMERGROUP
      );
      // End
      // Mengambil rincian permission branch
      const branchPermission = await PermissionMiddleware.getPermission(
        req.userId,
        selPermissionAllow.BRANCH,
        selPermissionType.CUSTOMERGROUP
      );
      // End
      // Mengambil rincian permission customerGroup
      const groupPermission = await PermissionMiddleware.getPermission(
        req.userId,
        selPermissionAllow.CUSTOMERGROUP,
        selPermissionType.CUSTOMERGROUP
      );
      // End

      if (!isFilter.status) {
        return res
          .status(400)
          .json({ status: 400, msg: "Error, Filter Invalid " });
      }
      // End

      let pipelineTotal: any = [
        {
          $lookup: {
            from: "branches",
            localField: "branch",
            foreignField: "_id",
            as: "branch",
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

      // Menambahkan filter berdasarkan permission user
      if (branchPermission.length > 0) {
        pipelineTotal.unshift({
          $match: {
            branch: { $in: branchPermission },
          },
        });
      }
      // End

      // Menambahkan filter berdasarkan permission user
      if (groupPermission.length > 0) {
        pipelineTotal.unshift({
          $match: {
            _id: { $in: groupPermission },
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
            from: "branches",
            localField: "branch",
            foreignField: "_id",
            as: "branch",
          },
        },
        // {
        //   $unwind: "$branch",
        // },
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

      // Menambahkan filter berdasarkan permission user
      if (userPermission.length > 0) {
        pipelineResult.unshift({
          $match: {
            createdBy: { $in: userPermission.map((id) => new ObjectId(id)) },
          },
        });
      }
      // End

      // Menambahkan filter berdasarkan permission user
      if (branchPermission.length > 0) {
        pipelineResult.unshift({
          $match: {
            branch: { $in: branchPermission },
          },
        });
      }
      // End

      // Menambahkan filter berdasarkan permission user
      if (groupPermission.length > 0) {
        pipelineResult.unshift({
          $match: {
            _id: { $in: groupPermission },
          },
        });
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
      return res
        .status(400)
        .json({ status: 400, msg: "Error, name wajib diisi!" });
    }

    if (!req.body.branch) {
      return res
        .status(400)
        .json({ status: 400, msg: "Error, branch wajib diisi!" });
    }

    try {
      // Cek branch terdaftar
      const cekBranch: any = await BranchModel.findOne({
        $and: [{ _id: req.body.branch }],
      });

      if (!cekBranch) {
        return res.status(404).json({
          status: 404,
          msg: "Error, branch tidak ditemukan!",
        });
      }

      if (cekBranch.status != 1) {
        return res.status(404).json({
          status: 404,
          msg: "Error, branch tidak aktif!",
        });
      }
      // End

      // Cek Parent
      if (req.body.parent) {
        const cekParent: any = await Db.findOne({
          _id: new ObjectId(req.body.parent),
        });

        if (!cekParent) {
          return res
            .status(400)
            .json({ status: 400, msg: "Error, parent tidak ditemukan!" });
        }

        if (cekParent.status != 1) {
          return res
            .status(400)
            .json({ status: 400, msg: "Error, parent tidak aktif!" });
        }

        req.body.parent = {
          _id: new ObjectId(req.body.parent),
          name: cekParent.name,
        };
      }
      // End

      req.body.createdBy = req.userId;
      const result = new Db(req.body);
      const response: any = await result.save();

      // push history
      await HistoryController.pushHistory({
        document: {
          _id: response._id,
          name: response.name,
          type: redisName,
        },
        message: `Menambahkan customer group ${response.name} `,
        user: req.userId,
      });
      // End

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

        // Mengambil rincian permission user
        const branchPermission = await PermissionMiddleware.getPermission(
          req.userId,
          selPermissionAllow.BRANCH,
          selPermissionType.CUSTOMERGROUP
        );
        // End

        if (branchPermission.length > 0) {
          const data = isCache.branch;

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

        const cekPermission = await cekValidPermission(
          req.userId,
          {
            user: isCache.createdBy._id,
            group: isCache._id,
          },
          selPermissionType.CUSTOMERGROUP
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

      // Mengambil rincian permission user
      const branchPermission = await PermissionMiddleware.getPermission(
        req.userId,
        selPermissionAllow.BRANCH,
        selPermissionType.CUSTOMERGROUP
      );
      // End

      let pipeline: any = [
        {
          $lookup: {
            from: "branches",
            localField: "branch",
            foreignField: "_id",
            as: "branch",
            pipeline: [{ $project: { _id: 1, name: 1 } }],
          },
        },

        {
          $lookup: {
            from: "users",
            localField: "createdBy",
            foreignField: "_id",
            as: "createdBy",
            pipeline: [{ $project: { _id: 1, name: 1 } }],
          },
        },
        {
          $unwind: "$createdBy",
        },
        {
          $graphLookup: {
            from: "customergroups",
            startWith: "$_id",
            connectFromField: "_id",
            connectToField: "parent._id",
            as: "childs",
          },
        },

        {
          $project: {
            name: 1,
            parent: 1,
            branch: 1,
            status: 1,
            workflowState: 1,
            createdBy: 1,
            childs: {
              _id: 1,
              name: 1,
              branch: 1,
            },
          },
        },
      ];

      if (branchPermission.length > 0) {
        pipeline.unshift({
          $match: {
            branch: { $in: branchPermission },
          },
        });
      }

      pipeline.unshift({
        $match: { _id: new ObjectId(req.params.id) },
      });

      const result: any = await Db.aggregate(pipeline);

      if (result.length === 0) {
        return res
          .status(404)
          .json({ status: 404, msg: "Data tidak ditemukan!" });
      }

      const data = result[0];

      const cekPermission = await cekValidPermission(
        req.userId,
        {
          user: data.createdBy._id,
          group: data._id,
        },
        selPermissionType.CUSTOMERGROUP
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
        data.workflowState
      );

      const getHistory = await History.find(
        {
          $and: [{ "document._id": data._id }, { "document.type": redisName }],
        },
        ["_id", "message", "createdAt", "updatedAt"]
      )
        .populate("user", "name")
        .sort({ createdAt: -1 });

      await Redis.client.set(
        `${redisName}-${req.params.id}`,
        JSON.stringify(data)
      );

      return res.status(200).json({
        status: 200,
        data: data,
        history: getHistory,
        workflow: buttonActions,
      });
    } catch (error) {
      return res.status(404).json({ status: 404, data: error });
    }
  };

  update = async (req: Request | any, res: Response): Promise<Response> => {
    // tidak boleh di edit
    if (req.body.createdBy) {
      return res.status(404).json({
        status: 404,
        msg: "Error, createdBy tidak dapat dirubah!",
      });
    }

    try {
      const result: any = await Db.findOne({
        _id: req.params.id,
      })
        .populate("branch", "name")
        .populate("createdBy", "name");

      if (req.body.branch) {
        // Cek branch terdaftar
        if (typeof req.body.branch !== "object") {
          return res.status(400).json({
            status: 400,
            msg: "Error, branch berupa type data object!",
          });
        }

        if (req.body.branch.length === 0) {
          return res.status(400).json({
            status: 400,
            msg: "Error, branch harus diisi minimal 1!",
          });
        }

        const uniqBranch: any = [...new Set(req.body.branch)];

        for (const item of uniqBranch) {
          let cekBranch: any = await BranchModel.findOne({
            $and: [{ _id: item }],
          });

          if (!cekBranch) {
            return res.status(404).json({
              status: 404,
              msg: `Error, branch ${item} tidak ditemukan! `,
            });
          }

          if (cekBranch.status != 1) {
            return res.status(404).json({
              status: 404,
              msg: `Error, branch ${item} tidak aktif!`,
            });
          }
        }

        req.body.branch = uniqBranch;
        // End
      }

      // Cek Parent
      if (req.body.parent) {
        const cekParent: any = await Db.findOne({
          _id: new ObjectId(req.body.parent),
        });

        if (!cekParent) {
          return res
            .status(400)
            .json({ status: 400, msg: "Error, parent tidak ditemukan!" });
        }

        if (cekParent.status != 1) {
          return res
            .status(400)
            .json({ status: 400, msg: "Error, parent tidak aktif!" });
        }

        req.body.parent = {
          _id: new ObjectId(req.body.parent),
          name: cekParent.name,
        };
      }
      // End

      if (result) {
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
        })
          .populate("branch", "name")
          .populate("createdBy", "name");

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
      let pipeline: any[] = [];

      const branchPermission = await PermissionMiddleware.getPermission(
        req.userId,
        selPermissionAllow.BRANCH,
        selPermissionType.CUSTOMERGROUP
      );
      // End

      if (branchPermission.length > 0) {
        pipeline.push({
          branch: { $in: branchPermission },
        });
      }

      pipeline.push({ _id: req.params.id });

      const getData: any = await Db.findOne({ $and: pipeline });

      if (!getData) {
        return res
          .status(404)
          .json({ status: 404, msg: "Error, Data tidak ditemukan!" });
      }

      // Mengambil rincian permission user

      const cekPermission = await cekValidPermission(
        req.userId,
        {
          user: getData.createdBy._id,
          group: getData._id,
        },
        selPermissionType.CUSTOMERGROUP
      );

      if (!cekPermission) {
        return res.status(403).json({
          status: 403,
          msg: "Anda tidak mempunyai akses untuk dok ini!",
        });
      }

      // if (getData.status === "1") {
      //   return res
      //     .status(404)
      //     .json({ status: 404, msg: "Error, status dokumen aktif!" });
      // }

      // const result = await Db.deleteOne({ _id: req.params.id });
      // await Redis.client.del(`${redisName}-${req.params.id}`);
      return res.status(200).json({ status: 200, data: getData });
    } catch (error) {
      return res.status(404).json({ status: 404, msg: error });
    }
  };
}

export default new CustomerGroupController();

import { Request, Response } from "express";
import Redis from "../config/Redis";
import { IStateFilter } from "../Interfaces";
import { FilterQuery } from "../utils";
import IController from "./ControllerInterface";
import { TypeOfState } from "../Interfaces/FilterInterface";
import {
  CustomerGroupModel,
  CustomerModel,
  CustomerModel as Db,
  History,
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

const redisName = "customer";

interface IGeoLOc {
  lat: number;
  lng: number;
  maxDistance: number;
  customerId?: ObjectId;
}

class CustomerController implements IController {
  index = async (req: Request | any, res: Response): Promise<Response> => {
    const stateFilter: IStateFilter[] = [
      {
        alias:"Id",
        name: "_id",
        operator: ["=", "!="],
        typeOf: TypeOfState.String,
      },
      {
        alias:"Name",
        name: "name",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
      },
      {
        alias:"CustomerGroup",
        name: "customerGroup",
        operator: ["=", "!="],
        typeOf: TypeOfState.String,
      },
      {
        alias:"Branch",
        name: "branch",
        operator: ["=", "!="],
        typeOf: TypeOfState.String,
      },
      {
        alias:"CreatedBy",
        name: "createdBy",
        operator: ["=", "!="],
        typeOf: TypeOfState.String,
      },
      {
        alias:"UpdatedAt",
        name: "updatedAt",
        operator: ["=", "!=", "like", "notlike", ">", "<", ">=", "<="],
        typeOf: TypeOfState.Date,
      },
      {
        alias:"CreatedAt",
        name: "createdAt",
        operator: ["=", "!=", "like", "notlike", ">", "<", ">=", "<="],
        typeOf: TypeOfState.Date,
      },
    ];
    try {
      const nearby: any = req.query.nearby
        ? JSON.parse(`${req.query.nearby}`)
        : [];

      const filters: any = req.query.filters
        ? JSON.parse(`${req.query.filters}`)
        : [];

      const fields: any = req.query.fields
        ? JSON.parse(`${req.query.fields}`)
        : [
            "name",
            "createdBy.name",
            "updatedAt",
            "customerGroup.name",
            "branch.name",
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
        "customerGroup",
        "createdBy",
        "branch",
        "_id",
      ]);

      if (!isFilter.status) {
        return res
          .status(400)
          .json({ status: 400, msg: "Error, Filter Invalid " });
      }
      // End

      // Mengecek permission user
      const userPermission = await PermissionMiddleware.getPermission(
        req.userId,
        selPermissionAllow.USER,
        selPermissionType.CUSTOMER
      );
      // End

      let pipelineTotal: any = [
        {
          $match: isFilter.data,
        },
        {
          $project: { _id: 1, createdBy: 1, customerGroup: 1 },
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

      // Menambahkan filter nearby gps
      if (nearby.length === 3) {
        const targetLatitude = parseFloat(`${nearby[0]}`);
        const targetLongitude = parseFloat(`${nearby[1]}`);
        const maxDistance = parseInt(`${nearby[2]}`);
        pipelineTotal.unshift({
          $geoNear: {
            near: {
              type: "Point",
              coordinates: [targetLongitude, targetLatitude],
            },
            distanceField: "distance",
            maxDistance: maxDistance, // Mengubah jarak maksimum menjadi meter
            spherical: true,
          },
        });
      }

      // End

      const totalData = await Db.aggregate(pipelineTotal);

      const getAll = totalData.length > 0 ? totalData[0].total_orders : 0;

      let pipelineResult: any = [
        {
          $match: isFilter.data,
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
            from: "customergroups",
            localField: "customerGroup",
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
            localField: "branch",
            foreignField: "_id",
            as: "branch",
          },
        },
        {
          $unwind: "$branch",
        },

        {
          $project: setField,
        },
        {
          $sort: order_by,
        },
      ];

      // Menambahkan limit ketika terdapat limit
      if (limit > 0) {
        pipelineResult.splice(2, 0, { $limit: limit });
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

      // Menambahkan filter nearby gps
      if (nearby.length === 3) {
        const targetLatitude = parseFloat(`${nearby[0]}`);
        const targetLongitude = parseFloat(`${nearby[1]}`);
        const maxDistance = parseInt(`${nearby[2]}`);
        pipelineResult.unshift({
          $geoNear: {
            near: {
              type: "Point",
              coordinates: [targetLongitude, targetLatitude],
            },
            distanceField: "distance",
            maxDistance: maxDistance,
            spherical: true,
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

    if (!req.body.customerGroup) {
      return res
        .status(400)
        .json({ status: 400, msg: "Error, customerGroup wajib diisi!" });
    }
    if (!req.body.branch) {
      return res
        .status(400)
        .json({ status: 400, msg: "Error, branch wajib diisi!" });
    }

    if (req.body.lat && req.body.lng) {
      req.body.location = {
        type: "Point",
        coordinates: [req.body.lng, req.body.lat],
      };
    }

    try {
      //Mengecek Customer Group
      const CekCG: any = await CustomerGroupModel.findOne({
        $and: [
          { _id: req.body.customerGroup },
          { branch: { $in: [new ObjectId(req.body.branch)] } },
        ],
      });

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

      req.body.createdBy = req.userId;
      const result = new Db(req.body);
      const response: any = await result.save();

      console.log(req.body);

      // push history
      await HistoryController.pushHistory({
        document: {
          _id: response._id,
          name: response.name,
          type: redisName,
        },
        message: `${req.user} menambahkan customer ${response.name} `,
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
      })
        .populate("createdBy", "name")
        .populate("customerGroup", "name")
        .populate("branch", "name");

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

  update = async (req: Request | any, res: Response): Promise<Response> => {
    // Cek data yang tidak boleh dirubah
    if (req.body.createdBy) {
      return res.status(404).json({
        status: 404,
        msg: "Error, createdby tidak dapat dirubah",
      });
    }
    // End
    if (req.body.branch) {
      return res.status(404).json({
        status: 404,
        msg: "Error, tidak dapat merubah branch!",
      });
    }

    if (req.body.lat && req.body.lng) {
      req.body.location = {
        type: "Point",
        coordinates: [req.body.lng, req.body.lat],
      };
    }

    try {
      const result: any = await Db.findOne({
        _id: req.params.id,
      });

      if (result) {
        //Mengecek jika Customer Group dirubah
        if (req.body.customerGroup) {
          if (typeof req.body.customerGroup !== "string") {
            return res.status(404).json({
              status: 404,
              msg: "Error, Cek kembali data customerGroup, Data harus berupa string id customerGroup!",
            });
          }

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

          req.body.branch = CekCG.branch._id;

          // End
        }
        // End

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

        return res.status(200).json({ status: 200, data: getData });
        // End
      } else {
        return res
          .status(400)
          .json({ status: 404, msg: "Error update, data tidak ditemukan!" });
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

      // if (getData.status === "1") {
      //   return res
      //     .status(404)
      //     .json({ status: 404, msg: "Error, status dokumen aktif!" });
      // }

      const result = await Db.deleteOne({ _id: req.params.id });
      await Redis.client.del(`${redisName}-${req.params.id}`);
      return res.status(200).json({ status: 200, data: result });
    } catch (error) {
      return res.status(404).json({ status: 404, msg: error });
    }
  };

  getLocatonNearby = async (data: IGeoLOc): Promise<any[]> => {
    const targetLatitude = parseFloat(`${data.lat}`);
    const targetLongitude = parseFloat(`${data.lng}`);
    const isMaxDistance = parseInt(`${data.maxDistance}`);

    try {
      const result: any = await CustomerModel.find({
        $and: [
          {
            location: {
              $near: {
                $geometry: {
                  type: "Point",
                  coordinates: [targetLongitude, targetLatitude],
                },
                $maxDistance: isMaxDistance,
              },
            },
          },
          { _id: data.customerId },
        ],
      });

      return result;
    } catch (error) {
      return [];
    }
  };
}

export default new CustomerController();

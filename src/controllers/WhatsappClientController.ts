import { Request, Response } from "express";
// import Redis from "../config/Redis";
import { Client } from "whatsapp-web.js";
import { IStateFilter } from "../Interfaces";
import { FilterQuery } from "../utils";
import IController from "./ControllerInterface";
import { History, PermissionModel, WhatsappClientModel } from "../models";
import { TypeOfState } from "../Interfaces/FilterInterface";
import { HistoryController, WorkflowController } from ".";
import { ISearch } from "../utils/FilterQuery";
import { PermissionMiddleware } from "../middleware";
import {
  selPermissionAllow,
  selPermissionType,
} from "../middleware/PermissionMiddleware";
import { ObjectId } from 'bson';
import { io } from "..";

const Db = WhatsappClientModel;
const redisName = "whatsappclient";

class WhatsappAccountController implements IController {
  index = async (req: Request | any, res: Response): Promise<Response> => {
    const stateFilter: IStateFilter[] = [

      {
        alias: "_id",
        name: "id",
        operator: ["=", "!="],
        typeOf: TypeOfState.String,
        isSort: true,
      },
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
          "desc",
          "createdBy.name",
          "status",
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



      // End

      // Menambahkan limit ketika terdapat limit
      if (limit > 0) {
        pipelineResult.push({ $limit: limit > 0 ? limit : getAll });
      }
      // End

      const result: any = await Db.aggregate(pipelineResult);
      let finalData: any = []


      if (result.length > 0) {
        const setData = result.map(async (item: any) => {
          let status = "Not Connected";
          let account = "";
          let phone = "";
          let client: Client = req.accounts[item._id];
          if (client) {

            if (await client.getState() == "CONNECTED") {
              status = "Connected"
              account = client.info.pushname;
              phone = client.info.wid.user;
            } else {
              status = "Not Connected"
            }
          }
          return { ...item, status: status, account, phone };
        });
        finalData = await Promise.all(setData)


        return res.status(200).json({
          status: 200,
          total: getAll,
          limit,
          nextPage: getAll > page * limit && limit > 0 ? page + 1 : page,
          hasMore: getAll > page * limit && limit > 0 ? true : false,
          data: finalData,
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
      return res.status(400).json({ status: 400, msg: "Nama wajib diisi!" });
    }

    const duplc = await Db.findOne({ name: req.body.name }, { _id: 1 })
    if (duplc) {
      return res.status(400).json({ status: 400, msg: `Nama ${req.body.name} sudah digunakan!` });
    }

    const lastAccount = await Db.findOne({}, { _id: 1 }).sort({ _id: -1 });


    if (!lastAccount) {
      req.body._id = "client1";
    } else {
      const angkaDiBelakangClient = parseInt(lastAccount._id.replace("client", ""), 10);
      req.body._id = `client${angkaDiBelakangClient + 1}`
    }
    req.body.createdBy = req.userId;
    try {
      const result = new Db(req.body);
      const response = await result.save();
      if (req.InitialClient && req.store) {
        req.InitialClient("client3", req.store);
      }

      return res.status(200).json({ status: 200, data: response });
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

      // const buttonActions = await WorkflowController.getButtonAction(
      //   redisName,
      //   req.userId,
      //   result.workflowState
      // );

      // // return res.send(buttonActions)
      // const getHistory = await History.find(
      //   {
      //     $and: [
      //       { "document._id": result._id },
      //       { "document.type": redisName },
      //     ],
      //   },
      //   ["_id", "message", "createdAt", "updatedAt"]
      // )
      //   .populate("user", "name")
      //   .sort({ createdAt: -1 });

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
        // history: getHistory,
        // workflow: buttonActions,
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
      // // Mengecek permission user
      // const userPermission = await PermissionMiddleware.getPermission(
      //   req.userId,
      //   selPermissionAllow.USER,
      //   selPermissionType.BRANCH
      // );
      // // End
      // // Mengecek permission user
      // const branchPermission = await PermissionMiddleware.getPermission(
      //   req.userId,
      //   selPermissionAllow.BRANCH,
      //   selPermissionType.BRANCH
      // );
      // // End

      let pipeline: any[] = [
        {
          _id: req.params.id,
        },
      ];

      // if (userPermission.length > 0) {
      //   pipeline.push({ createdBy: { $in: userPermission } });
      // }

      // if (branchPermission.length > 0) {
      //   pipeline.push({ _id: { $in: branchPermission } });
      // }

      const result = await Db.findOne({ $and: pipeline });

      if (!result) {
        return res
          .status(404)
          .json({ status: 404, msg: "Error, Data tidak ditemukan!" });
      }

      // // Cek apakah digunakan di permission data
      // const permission = await PermissionModel.findOne(
      //   {
      //     $and: [
      //       { allow: "branch" },
      //       {
      //         value: new ObjectId(req.params.id),
      //       },
      //     ],
      //   },
      //   { _id: 1 }
      // );

      // if (permission) {
      //   return res.status(404).json({
      //     status: 404,
      //     msg: "Branch ini sudah digunakan oleh data permission!",
      //   });
      // }
      // // End

      // if (result.status === "1") {
      //   return res
      //     .status(404)
      //     .json({ status: 404, msg: "Error, status dokumen aktif!" });
      // }

      const actionDel = await Db.findOneAndDelete({ _id: req.params.id });
      // await Redis.client.del(`${redisName}-${req.params.id}`);

      return res.status(200).json({ status: 200, data: actionDel });
    } catch (error) {
      return res.status(404).json({ status: 404, msg: error });
    }
  };

  getStatus = async (req: Request | any, res: Response) => {
    try {
      if (!req.accounts) {
        return res.status(400).json({ status: 404, msg: "Error, Account tidak ada!" });
      }

      let status: string;
      const client = await req.accounts[req.params.user];
      if (client) {
        io.to(req.params.user).emit("message", "Loading .. ");
        const state = await client.getState()
        status = state ? state === "CONNECTED" ? "Client is connected!" : state : "Not Connected..";

        io.to(req.params.user).emit("message", status);

        return res.status(200).json({ status: 200, data: status });
      } else {
        return res.status(400).json({ status: 400, msg: "Error, Account tidak ditemukan!" });
      }

    } catch (error) {
      return res.status(400).json({ status: 400, msg: error });
    }
  };


  logout = async (req: Request | any, res: Response) => {
    try {
      if (!req.accounts) {
        return res.status(400).json({ status: 404, msg: "Error, Account tidak ada!" });
      }
      const client: Client = await req.accounts[req.params.user];
      if (client) {
        const state = await client.getState()
        if (state !== "CONNECTED") {
          return res.status(400).json({ status: 400, msg: "Error, User not connected" });
        } else {
          try {
            io.to(req.params.user).emit("message", "Loading");
            await client.logout();
            await client.destroy();
            client.initialize();
            io.to(req.params.user).emit("message", "Logout was successful");
            return res.status(200).json({ status: 400, msg: "Logout was successful" });
          } catch (error) {
            io.to(req.params.user).emit("message", "Failed to log out");
          }

        }
      } else {
        return res.status(400).json({ status: 400, msg: "Error, Account tidak ditemukan!" });
      }

    } catch (error) {
      return res.status(400).json({ status: 400, msg: error });
    }
  };

  refresh = async (req: Request | any, res: Response) => {
    try {
      if (!req.accounts) {
        return res.status(400).json({ status: 404, msg: "Error, Account tidak ada!" });
      }
      io.to(req.params.user).emit("loading", true);
      const client: Client = await req.accounts[req.params.user];
      if (client) {
        const state = await client.getState()
        if (state === "CONNECTED") {
          return res.status(400).json({ status: 400, msg: "Error, this account is connected" });
        } else {
          try {

            await client.destroy()
            client.initialize();
            io.to(req.params.user).emit("message", "Waiting for new qr :)");

            return res.status(200).json({ status: 400, msg: "Success, Please wait for the new qr code" });
          } catch (error) {
            io.to(req.params.user).emit("message", "Failed to refresh");
            io.to(req.params.user).emit("loading", false);
            return res.status(400).json({ status: 400, msg: "Error, refresh error" });
          }

        }
      } else {
        io.to(req.params.user).emit("loading", false);
        return res.status(400).json({ status: 400, msg: "Error, Account tidak ditemukan!" });
      }

    } catch (error) {
      io.to(req.params.user).emit("loading", false);
      return res.status(400).json({ status: 400, msg: error });
    }

  };
}

export default new WhatsappAccountController();

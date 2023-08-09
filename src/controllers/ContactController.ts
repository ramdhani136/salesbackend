import { Request, Response } from "express";
// import Redis from "../config/Redis";
import { IStateFilter } from "../Interfaces";
import { FilterQuery, cekValidPermission } from "../utils";
import IController from "./ControllerInterface";
import { TypeOfState } from "../Interfaces/FilterInterface";
import { CustomerModel, ContactModel as Db, History } from "../models";
import { PermissionMiddleware } from "../middleware";
import {
  selPermissionAllow,
  selPermissionType,
} from "../middleware/PermissionMiddleware";
import { ObjectId } from "mongodb";
import HistoryController from "./HistoryController";
import WorkflowController from "./WorkflowController";
import { ISearch } from "../utils/FilterQuery";

const redisName = "contact";

class ContactController implements IController {
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
        alias: "Phone",
        name: "phone",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
        isSort: true,
      },
      {
        alias: "Email",
        name: "email",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
        isSort: true,
      },
      {
        alias: "Customer",
        name: "customer",
        operator: ["=", "!="],
        typeOf: TypeOfState.String,
      },
      {
        alias: "Status",
        name: "status",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
        isSort: true,
      },
      {
        alias: "WorkflowState",
        name: "workflowState",
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
      const filters: any = req.query.filters
        ? JSON.parse(`${req.query.filters}`)
        : [];
      const fields: any = req.query.fields
        ? JSON.parse(`${req.query.fields}`)
        : [
            "name",
            "phone",
            "position",
            "customer._id",
            "customer.name",
            "customer.customerGroup",
            "customer.branch",
            "createdBy._id",
            "createdBy.name",
            "status",
            "workflowState",
            "updatedAt",
          ];
      const order_by: any = req.query.order_by
        ? JSON.parse(`${req.query.order_by}`)
        : { updatedAt: -1 };
      const limit: number | string = parseInt(`${req.query.limit}`) || 0;
      let page: number | string = parseInt(`${req.query.page}`) || 1;
      let setField = FilterQuery.getField(fields);
      let search: ISearch = {
        filter: ["name", "phone"],
        value: req.query.search || "",
      };
      let isFilter = FilterQuery.getFilter(filters, stateFilter, search, [
        "customer",
        "createdBy",
        "_id",
      ]);

      // Mengambil rincian permission user
      const userPermission = await PermissionMiddleware.getPermission(
        req.userId,
        selPermissionAllow.USER,
        selPermissionType.CONTACT
      );
      // End

      // Mengambil rincian permission customer
      const customerPermission = await PermissionMiddleware.getPermission(
        req.userId,
        selPermissionAllow.CUSTOMER,
        selPermissionType.CONTACT
      );
      // End

      // Mengambil rincian permission group
      const groupPermission = await PermissionMiddleware.getPermission(
        req.userId,
        selPermissionAllow.CUSTOMERGROUP,
        selPermissionType.CONTACT
      );
      // End

      // Mengambil rincian permission branch
      const branchPermission = await PermissionMiddleware.getPermission(
        req.userId,
        selPermissionAllow.BRANCH,
        selPermissionType.CONTACT
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
          $match: isFilter.data,
        },
        {
          $project: { _id: 1, createdBy: 1, customer: 1 },
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

      if (customerPermission.length > 0) {
        pipelineTotal.unshift({
          $match: {
            customer: { $in: customerPermission },
          },
        });
      }
      // End

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
            from: "customers",
            localField: "customer",
            foreignField: "_id",
            as: "customer",
            pipeline: [
              {
                $lookup: {
                  from: "customergroups",
                  localField: "customerGroup",
                  foreignField: "_id",
                  as: "customerGroup",
                  pipeline: [{ $project: { _id: 1, name: 1 } }],
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
                  pipeline: [{ $project: { _id: 1, name: 1 } }],
                },
              },
              {
                $unwind: "$branch",
              },
            ],
          },
        },
        {
          $unwind: "$customer",
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

      // Menambahkan fieldset ketika terdapat setfield

      if (Object.keys(setField).length > 0) {
        pipelineResult.push({
          $project: setField,
        });
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
      if (customerPermission.length > 0) {
        pipelineResult.unshift({
          $match: {
            customer: { $in: customerPermission },
          },
        });
      }
      // End

      // Cek jika terdapat permission branch dan customergroup

      if (groupPermission.length > 0 || branchPermission.length > 0) {
        let pipelineCustomer: any[] = [];

        if (groupPermission.length > 0) {
          pipelineCustomer.push({
            customerGroup: {
              $in: groupPermission,
            },
          });
        }

        if (branchPermission.length > 0) {
          pipelineCustomer.push({
            branch: {
              $in: branchPermission,
            },
          });
        }

        const validCustomer = await CustomerModel.find(
          {
            $and: pipelineCustomer,
          },
          { _id: 1 }
        );

        const finalFilterCustomer = validCustomer.map((item) => {
          return item._id;
        });

        pipelineResult.unshift({
          $match: {
            customer: { $in: finalFilterCustomer },
          },
        });

        pipelineTotal.unshift({
          $match: {
            customer: { $in: finalFilterCustomer },
          },
        });
      }
      //End

      const totalData = await Db.aggregate(pipelineTotal);
      const getAll = totalData.length > 0 ? totalData[0].total_orders : 0;
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

    if (!req.body.phone) {
      return res
        .status(400)
        .json({ status: 400, msg: "Error, phone wajib diisi!" });
    }

    if (!req.body.position) {
      return res
        .status(400)
        .json({ status: 400, msg: "Error, Position wajib diisi!" });
    }

    if (!req.body.customer) {
      return res
        .status(400)
        .json({ status: 400, msg: "Error, customer wajib diisi!" });
    }

    try {
      //Mengecek Customer
      const cekCustomer: any = await CustomerModel.findOne(
        {
          $and: [{ _id: req.body.customer }],
        },
        ["name", "customerGroup", "branch", "status", "createdBy"]
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
      // End

      const cekPermission = await cekValidPermission(
        req.userId,
        {
          branch: cekCustomer.branch,
          group: cekCustomer.customerGroup,
          customer: cekCustomer._id,
        },
        selPermissionType.CONTACT
      );

      if (!cekPermission) {
        return res.status(403).json({
          status: 403,
          msg: "Anda tidak mempunyai akses untuk customer ini!",
        });
      }

      // set CreatedAt
      req.body.createdBy = req.userId;
      // End

      // Cek valid contact
      const duplc = await Db.findOne({ name: req.body.name });
      if (duplc) {
        return res.status(404).json({
          status: 404,
          msg: "Error, nama kontak sudah digunakan sebelumnya!",
        });
      }
      // End

      // Cek nomor phone
      const regex = /^\d{10,}$/;
      const isValidPhone = regex.test(req.body.phone);

      if (!isValidPhone) {
        return res.status(404).json({
          status: 404,
          msg: "Error, Cek kembali nomor telepon",
        });
      }
      // End

      const result = new Db(req.body);
      const upload: any = await result.save();
      const response = await upload.populate("customer", "name");

      // push history
      await HistoryController.pushHistory({
        document: {
          _id: response._id,
          name: response.name,
          type: redisName,
        },
        message: `${req.user} menambahkan kontak ${response.name} pada customer ${response.customer.name} `,
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
      // const cache = await Redis.client.get(`${redisName}-${req.params.id}`);
      // if (cache) {
      //   const isCache = JSON.parse(cache);

      //   const cekPermission = await cekValidPermission(
      //     req.userId,
      //     {
      //       user: isCache.createdBy._id,
      //       branch: isCache.customer.branch._id,
      //       group: isCache.customer.customerGroup._id,
      //       customer: isCache.customer._id,
      //     },
      //     selPermissionType.CONTACT
      //   );

      //   if (!cekPermission) {
      //     return res.status(403).json({
      //       status: 403,
      //       msg: "Anda tidak mempunyai akses untuk dok ini!",
      //     });
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

      const getData = await Db.aggregate([
        {
          $match: { _id: new ObjectId(req.params.id) },
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
          $lookup: {
            from: "customers",
            localField: "customer",
            foreignField: "_id",
            as: "customer",
            pipeline: [
              {
                $lookup: {
                  from: "customergroups",
                  localField: "customerGroup",
                  foreignField: "_id",
                  as: "customerGroup",
                  pipeline: [{ $project: { _id: 1, name: 1 } }],
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
                  pipeline: [{ $project: { _id: 1, name: 1 } }],
                },
              },
              {
                $unwind: "$branch",
              },
            ],
          },
        },
        {
          $unwind: "$customer",
        },
        {
          $project: {
            "customer.createdBy": 0,
            "customer.status": 0,
            "customer.workflowState": 0,
            "customer.createdAt": 0,
            "customer.updatedAt": 0,
            "customer.__v": 0,
          },
        },
      ]);

      if (getData.length === 0) {
        return res
          .status(404)
          .json({ status: 404, msg: "Data tidak ditemukan!" });
      }

      const result = getData[0];

      const cekPermission = await cekValidPermission(
        req.userId,
        {
          user: result.createdBy._id,
          branch: result.customer.branch._id,
          group: result.customer.customerGroup._id,
          customer: result.customer._id,
        },
        selPermissionType.CONTACT
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

      // await Redis.client.set(
      //   `${redisName}-${req.params.id}`,
      //   JSON.stringify(result)
      // );

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
    try {
      const prev: any = await Db.findOne({
        _id: req.params.id,
      }).populate("customer", "name");

      if (prev) {
        const validPermission: any = await Db.findOne({
          _id: req.params.id,
        }).populate("customer", "customerGroup branch");

        const cekPermission = await cekValidPermission(
          req.userId,
          {
            user: validPermission.createdBy,
            branch: validPermission.customer.branch,
            group: validPermission.customer.customerGroup,
            customer: validPermission.customer._id,
          },
          selPermissionType.CONTACT
        );

        if (!cekPermission) {
          return res.status(403).json({
            status: 403,
            msg: "Anda tidak mempunyai akses untuk dok ini!",
          });
        }

        // Cek duplicate
        if (req.body.name) {
          const duplc = await Db.findOne({
            $and: [
              { name: req.body.name },
              {
                _id: { $ne: req.params.id },
              },
            ],
          });
          if (duplc) {
            return res.status(404).json({
              status: 404,
              msg: "Error, nama kontak sudah digunakan sebelumnya!",
            });
          }
          // End
        }

        //Mengecek Customer

        if (req.body.customer) {
          if (typeof req.body.customer !== "string") {
            return res.status(404).json({
              status: 404,
              msg: "Error, Cek kembali data customer, Data harus berupa string id customer!",
            });
          }

          const cekCustomer: any = await CustomerModel.findOne(
            {
              $and: [{ _id: req.body.customer }],
            },
            ["name", "customerGroup", "status"]
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
          // End
        }

        // End

        // Cek nomor phone
        if (req.body.phone) {
          const regex = /^\d{10,}$/;
          const isValidPhone = regex.test(req.body.phone);

          if (!isValidPhone) {
            return res.status(404).json({
              status: 404,
              msg: "Error, Cek kembali nomor telepon",
            });
          }
        }
        // End

        if (req.body.nextState) {
          const checkedWorkflow =
            await WorkflowController.permissionUpdateAction(
              redisName,
              req.userId,
              req.body.nextState,
              prev.createdBy._id
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

        const nextResult: any = await Db.findOne({
          _id: req.params.id,
        }).populate("customer", "name");

        const resultData = await Db.aggregate([
          {
            $match: { _id: new ObjectId(req.params.id) },
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
            $lookup: {
              from: "customers",
              localField: "customer",
              foreignField: "_id",
              as: "customer",
              pipeline: [
                {
                  $lookup: {
                    from: "customergroups",
                    localField: "customerGroup",
                    foreignField: "_id",
                    as: "customerGroup",
                    pipeline: [{ $project: { _id: 1, name: 1 } }],
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
                    pipeline: [{ $project: { _id: 1, name: 1 } }],
                  },
                },
                {
                  $unwind: "$branch",
                },
              ],
            },
          },
          {
            $unwind: "$customer",
          },
          {
            $project: {
              "customer.createdBy": 0,
              "customer.status": 0,
              "customer.workflowState": 0,
              "customer.createdAt": 0,
              "customer.updatedAt": 0,
              "customer.__v": 0,
            },
          },
        ]);

        // await Redis.client.set(
        //   `${redisName}-${req.params.id}`,
        //   JSON.stringify(resultData[0]),
        //   {
        //     EX: 30,
        //   }
        // );

        // push history semua field yang di update
        await HistoryController.pushUpdateMany(
          prev,
          nextResult,
          req.user,
          req.userId,
          redisName
        );

        return res.status(200).json({ status: 200, data: resultData[0] });
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
      const getData: any = await Db.findOne({ _id: req.params.id }).populate(
        "customer",
        "status customerGroup branch"
      );

      if (!getData) {
        return res
          .status(404)
          .json({ status: 404, msg: "Error, Data tidak ditemukan!" });
      }

      const cekPermission = await cekValidPermission(
        req.userId,
        {
          user: getData.createdBy,
          branch: getData.customer.branch,
          group: getData.customer.customerGroup,
          customer: getData.customer._id,
        },
        selPermissionType.CONTACT
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

      const result = await Db.deleteOne({ _id: req.params.id });
      // await Redis.client.del(`${redisName}-${req.params.id}`);
      return res.status(200).json({ status: 200, data: result });
    } catch (error) {
      return res.status(404).json({ status: 404, msg: error });
    }
  };
}

export default new ContactController();

import { Request, Response } from "express";
// import Redis from "../config/Redis";
import { IStateFilter } from "../Interfaces";
import { FilterQuery } from "../utils";
import IController from "./ControllerInterface";
import { History, TagModel, TopicModel } from "../models";
import { TypeOfState } from "../Interfaces/FilterInterface";
import { HistoryController, WorkflowController } from ".";
import { ISearch } from "../utils/FilterQuery";

import { ObjectId } from "mongodb";

const Db = TopicModel;
const redisName = "topic";

class TopicController implements IController {
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
        alias: "TagsRestrict",
        name: "tags.restrict",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
      },
      {
        alias: "TagsMandatory",
        name: "tags.mandatory",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
      },
      {
        alias: "AllowTaggingItem",
        name: "tags.allowTaggingItem",
        operator: ["=", "!="],
        typeOf: TypeOfState.Number,
        listData: [
          { name: "0", value: 0 },
          { name: "1", value: 1 },
        ],
      },
      {
        alias: "TaskActive",
        name: "taskActive",
        operator: ["=", "!="],
        typeOf: TypeOfState.Number,
        listData: [
          { name: "0", value: 0 },
          { name: "1", value: 1 },
        ],
      },
      {
        alias: "CreatedBy",
        name: "createdBy",
        operator: ["=", "!="],
        typeOf: TypeOfState.String,
      },
      {
        alias: "Status",
        name: "status",
        operator: ["=", "!="],
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
            "tags",
            "lng",
            "desc",
            "workflowState",
            "createdBy._id",
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

      // Mengambil hasil fields
      let setField = FilterQuery.getField(fields);
      // End

      // Mengambil hasil filter
      let isFilter = FilterQuery.getFilter(filters, stateFilter, search, [
        "createdBy",
        "_id",
        "tags.restrict",
        "tags.mandatory",
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
          $lookup: {
            from: "tags",
            localField: "tags.mandatory",
            foreignField: "_id",
            as: "tags.mandatory",
            pipeline: [
              {
                $project: {
                  _id: 1,
                  name: 1,
                },
              },
            ],
          },
        },
        {
          $lookup: {
            from: "tags",
            localField: "tags.restrict",
            foreignField: "_id",
            as: "tags.restrict",
            pipeline: [
              {
                $project: {
                  _id: 1,
                  name: 1,
                },
              },
            ],
          },
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
      if (!req.body.name) {
        return res.status(400).json({ status: 400, msg: "name Required!" });
      }

      // Cek Duplicate name
      const duplc = await Db.findOne({ name: req.body.name });
      if (duplc) {
        return res.status(400).json({
          status: 400,
          msg: `${req.body.name} is already in the topic data!`,
        });
      }

      // End
      req.body.createdBy = req.userId;
      // Cek tag

      if (req.body.tags) {
        if (req.body.tags.restrict) {
          if (typeof req.body.tags.restrict !== "object") {
            return res
              .status(400)
              .json({ status: 400, msg: "Error, tags harus berupa object!" });
          }

          for (const item of req.body.tags.restrict) {
            try {
              let getTag: any = await TagModel.findById(new ObjectId(item));
              if (!getTag) {
                return res.status(400).json({
                  status: 400,
                  msg: `Error, tag ${item} tidak ditemukan!`,
                });
              }
            } catch (error) {
              return res.status(400).json({
                status: 400,
                msg: "Invalid Tags Id",
              });
            }
          }
        }
        if (req.body.tags.mandatory) {
          if (typeof req.body.tags.mandatory !== "object") {
            return res
              .status(400)
              .json({ status: 400, msg: "Error, tags harus berupa object!" });
          }

          for (const item of req.body.tags.mandatory) {
            try {
              let getTag: any = await TagModel.findById(new ObjectId(item));
              if (!getTag) {
                return res.status(400).json({
                  status: 400,
                  msg: `Error, tag ${item} tidak ditemukan!`,
                });
              }

              // Cek apakah mandatory tags ada di restrcit

              if (req.body.tags.restrict.length > 0) {
                let cekRestrict = req.body.tags.restrict.find((tag: any) => {
                  return tag === item;
                });

                if (!cekRestrict) {
                  return res.status(400).json({
                    status: 400,
                    msg: `Error, ${item} mandatory tags item must also set be filled in restrict tags!`,
                  });
                }
              }

              // End
            } catch (error) {
              return res.status(400).json({
                status: 400,
                msg: "Invalid Tags Id",
              });
            }
          }
        }
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
        message: `Membuat ${redisName} ${req.body.name} `,
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

      let pipelineResult: any = [
        { $match: { _id: new ObjectId(req.params.id) } },
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
            from: "tags",
            localField: "tags.mandatory",
            foreignField: "_id",
            as: "tags.mandatory",
            pipeline: [
              {
                $project: {
                  _id: 1,
                  name: 1,
                },
              },
            ],
          },
        },
        {
          $lookup: {
            from: "tags",
            localField: "tags.restrict",
            foreignField: "_id",
            as: "tags.restrict",
            pipeline: [
              {
                $project: {
                  _id: 1,
                  name: 1,
                },
              },
            ],
          },
        },
      ];

      const response = await Db.aggregate(pipelineResult);

      if (response.length === 0) {
        return res
          .status(404)
          .json({ status: 404, msg: "Data tidak ditemukan!" });
      }

      const result = response[0];

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
      let pipeline: any[] = [
        {
          _id: req.params.id,
        },
      ];

      const result: any = await Db.findOne({
        $and: pipeline,
      })
        .populate("tags.mandatory", "name")
        .populate("tags.restrict", "name");

      if (result) {
        // Cek Duplicate name
        const duplc = await Db.findOne({
          $and: [
            { name: req.body.name ?? result.name },
            {
              _id: { $ne: req.params.id },
            },
          ],
        });
        if (duplc) {
          return res.status(400).json({
            status: 400,
            msg: `${req.body.name} is already in the topic data!`,
          });
        }
        // End

        if (req.body.tags) {
          if (req.body.tags.restrict) {
            if (typeof req.body.tags.restrict !== "object") {
              return res
                .status(400)
                .json({ status: 400, msg: "Error, tags harus berupa object!" });
            }

            for (const item of req.body.tags.restrict) {
              try {
                let getTag: any = await TagModel.findById(new ObjectId(item));
                if (!getTag) {
                  return res.status(400).json({
                    status: 400,
                    msg: `Error, tag ${item} tidak ditemukan!`,
                  });
                }
              } catch (error) {
                return res.status(400).json({
                  status: 400,
                  msg: "Invalid Tags Id",
                });
              }
            }
          }

          if (req.body.tags.mandatory) {
            if (typeof req.body.tags.mandatory !== "object") {
              return res
                .status(400)
                .json({ status: 400, msg: "Error, tags harus berupa object!" });
            }

            for (const item of req.body.tags.mandatory) {
              try {
                let getTag: any = await TagModel.findById(new ObjectId(item));
                if (!getTag) {
                  return res.status(400).json({
                    status: 400,
                    msg: `Error, tag ${item} tidak ditemukan!`,
                  });
                }

                // Cek apakah mandatory tags ada di restrcit

                if (req.body.tags.restrict.length > 0) {
                  let cekRestrict = req.body.tags.restrict.find((tag: any) => {
                    return tag === item;
                  });

                  if (!cekRestrict) {
                    return res.status(400).json({
                      status: 400,
                      msg: `Error, ${item} mandatory tags item must also set be filled in restrict tags!`,
                    });
                  }
                }

                // End
              } catch (error) {
                return res.status(400).json({
                  status: 400,
                  msg: "Invalid Tags Id",
                });
              }
            }
          }

          // End
        }

        if (req.body.nextState) {
          const checkedWorkflow =
            await WorkflowController.permissionUpdateAction(
              redisName,
              req.userId,
              req.body.nextState,
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
        })
          .populate("tags.mandatory", "name")
          .populate("tags.restrict", "name");
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
      let pipeline: any[] = [
        {
          _id: req.params.id,
        },
      ];

      const result = await Db.findOne({ $and: pipeline });

      if (!result) {
        return res
          .status(404)
          .json({ status: 404, msg: "Error, Data tidak ditemukan!" });
      }

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
        message: `Menghapus ${redisName}  ${result.name}`,
        user: req.userId,
      });
      // End
      return res.status(200).json({ status: 200, data: actionDel });
    } catch (error) {
      return res.status(404).json({ status: 404, msg: error });
    }
  };
}

export default new TopicController();

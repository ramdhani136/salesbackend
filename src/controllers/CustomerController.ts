import { Request, Response } from "express";
// import Redis from "../config/Redis";
import { IStateFilter } from "../Interfaces";
import { FilterQuery, cekValidPermission } from "../utils";
import IController from "./ControllerInterface";
import { TypeOfState } from "../Interfaces/FilterInterface";
import {
  BranchModel,
  ConfigModel,
  ContactModel,
  CustomerGroupModel,
  CustomerModel,
  CustomerModel as Db,
  History,
  PermissionModel,
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
import fs from "fs";
import sharp from "sharp";
import path from "path";
const redisName = "customer";
const csv = require("csvtojson");

interface IGeoLOc {
  lat: number;
  lng: number;
  maxDistance: number;
  customerId?: ObjectId;
  withNoLocation?: Boolean;
}

class CustomerController implements IController {
  index = async (req: Request | any, res: Response): Promise<Response> => {
    const stateFilter: IStateFilter[] = [
      {
        alias: "Status",
        name: "status",
        operator: ["=", "!="],
        typeOf: TypeOfState.String,
        listData: [
          { value: "0", name: "Draft" },
          { value: "1", name: "Submitted" },
          { value: "2", name: "Canceled" },
        ],
      },
      {
        alias: "Name",
        name: "name",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
        isSort: true,
      },
      {
        alias: "ErpId",
        name: "erpId",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
        isSort: true,
      },
      {
        alias: "CustomerGroup",
        name: "customerGroup",
        operator: ["=", "!="],
        typeOf: TypeOfState.String,
      },
      {
        alias: "Branch",
        name: "branch",
        operator: ["=", "!="],
        typeOf: TypeOfState.String,
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
            "createdBy._id",
            "createdBy.name",
            "updatedAt",
            "customerGroup._id",
            "customerGroup.name",
            "branch._id",
            "branch.name",
            "erpId",
            "distance",
            "img",
            "status",
            "workflowState",
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

      const notFilterGroup = filters.filter(
        (item: string[]) => !["customerGroup"].includes(item[0])
      );

      let isFilter = FilterQuery.getFilter(
        notFilterGroup,
        stateFilter,
        search,
        ["customerGroup", "createdBy", "branch", "_id"]
      );

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

      // Mengambil rincian permission branch
      const branchPermission = await PermissionMiddleware.getPermission(
        req.userId,
        selPermissionAllow.BRANCH,
        selPermissionType.CUSTOMER
      );
      // End
      // Mengambil rincian permission customerGroup
      const groupPermission = await PermissionMiddleware.getPermission(
        req.userId,
        selPermissionAllow.CUSTOMERGROUP,
        selPermissionType.CUSTOMER
      );
      // End

      const customerPermission = await PermissionMiddleware.getPermission(
        req.userId,
        selPermissionAllow.CUSTOMER,
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

      // Menambahkan filter berdasarkan permission branch
      if (branchPermission.length > 0) {
        pipelineTotal.unshift({
          $match: {
            branch: { $in: branchPermission },
          },
        });

        pipelineResult.unshift({
          $match: {
            branch: { $in: branchPermission },
          },
        });
      }
      // End

      // Menambahkan filter berdasarkan permission branch
      if (groupPermission.length > 0) {
        pipelineTotal.unshift({
          $match: {
            customerGroup: { $in: groupPermission },
          },
        });

        pipelineResult.unshift({
          $match: {
            customerGroup: { $in: groupPermission },
          },
        });
      }
      // End

      // Menambahkan filter berdasarkan permission user
      if (userPermission.length > 0) {
        pipelineTotal.unshift({
          $match: {
            createdBy: { $in: userPermission.map((id) => new ObjectId(id)) },
          },
        });

        pipelineResult.unshift({
          $match: {
            createdBy: { $in: userPermission.map((id) => new ObjectId(id)) },
          },
        });
      }
      // End

      // Menambahkan filter berdasarkan permission branch
      if (customerPermission.length > 0) {
        pipelineTotal.unshift({
          $match: {
            _id: { $in: customerPermission },
          },
        });

        pipelineResult.unshift({
          $match: {
            _id: { $in: customerPermission },
          },
        });
      }
      // End

      // Menambahkan filter nearby gps

      if (nearby.length === 3) {
        const targetLatitude = parseFloat(`${nearby[0]}`);
        const targetLongitude = parseFloat(`${nearby[1]}`);
        let maxDistance = parseInt(`${nearby[2]}`);

        // Cek Default jarak
        if (parseInt(`${nearby[2]}`) < 1) {
          const config: any = await ConfigModel.findOne({}, { customer: 1 });
          if (config) {
            if (config?.customer.locationDistance !== 0) {
              maxDistance = parseInt(`${config?.customer.locationDistance}`);
            }
          }
        }
        // End

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
        pipelineResult.unshift({
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

      const filterGroup = filters.filter((item: string[]) =>
        ["customerGroup"].includes(item[0])
      );

      const isGroup = filterGroup.map((item: any) => new ObjectId(item[2]));
      if (isGroup.length > 0) {
        const childGroup = await PermissionMiddleware.getCustomerChild(isGroup);

        pipelineResult.unshift({
          $match: { customerGroup: { $in: childGroup } },
        });
        pipelineTotal.unshift({
          $match: { customerGroup: { $in: childGroup } },
        });
      }

      // // Menambahkan limit ketika terdapat limit
      if (limit > 0) {
        pipelineResult.splice(
          nearby.length === 3 ? 3 : isGroup.length > 0 ? 3 : 2,
          0,
          {
            $limit: limit,
          }
        );
      }
      // End

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
        msg: "No Data",
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

    if (req.body.lat && req.body.lng) {
      req.body.location = {
        type: "Point",
        coordinates: [req.body.lng, req.body.lat],
      };
    }

    try {
      if (
        !req.body.branch ||
        req.body.branch == "" ||
        req.body.branch == "null"
      ) {
        return res
          .status(400)
          .json({ status: 400, msg: "Error, branch wajib diisi!" });
      }

      const cekBranch = await BranchModel.findById(req.body.branch, [
        "_id",
        "status",
      ]);
      if (!cekBranch) {
        return res.status(404).json({
          status: 404,
          msg: "Branch tidak ditemukan!",
        });
      }
      if (cekBranch.status !== "1") {
        return res.status(400).json({
          status: 400,
          msg: "Branch tidak aktif!",
        });
      }

      if (
        !req.body.customerGroup ||
        req.body.customerGroup == "" ||
        req.body.customerGroup == "null"
      ) {
        return res
          .status(400)
          .json({ status: 400, msg: "Error, customerGroup wajib diisi!" });
      }

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

      // Upload data ketika outsite
      if (req.file) {
        const compressedImage = path.join(
          __dirname,
          "../public/customers",
          `${response._id}.jpg`
        );
        sharp(req.file.path)
          .resize(640, 480, {
            fit: sharp.fit.inside,
            withoutEnlargement: true,
          })
          .jpeg({
            quality: 100,
            progressive: true,
            chromaSubsampling: "4:4:4",
          })
          .withMetadata()
          .toFile(compressedImage, async (err, info): Promise<any> => {
            if (err) {
              console.log(err);
            } else {
              await Db.updateOne(
                { _id: response._id },
                { img: `${response._id}.jpg` }
              );
            }
          });
      }
      // End

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
      // const cache = await Redis.client.get(`${redisName}-${req.params.id}`);
      // if (cache) {
      //   const isCache = JSON.parse(cache);

      //   const cekPermission = await cekValidPermission(
      //     req.userId,
      //     {
      //       user: isCache.createdBy._id,
      //       group: isCache.customerGroup._id,
      //       customer: isCache._id,
      //       branch: isCache.branch._id,
      //     },
      //     selPermissionType.CUSTOMER
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

      const cekPermission = await cekValidPermission(
        req.userId,
        {
          user: result.createdBy._id,
          group: result.customerGroup._id,
          customer: result._id,
          branch: result.branch._id,
        },
        selPermissionType.CUSTOMER
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
    // // End

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
        const cekPermission = await cekValidPermission(
          req.userId,
          {
            user: result.createdBy,
            group: result.customerGroup,
            customer: result._id,
            branch: result.branch,
          },
          selPermissionType.CUSTOMER
        );

        if (!cekPermission) {
          return res.status(403).json({
            status: 403,
            msg: "Anda tidak mempunyai akses untuk dok ini!",
          });
        }

        if (req.body.branch) {
          console.log(req.body.branch);
          if (req.body.branch == "" || req.body.branch == "null") {
            console.log("Ddddd");
            return res.status(400).json({
              status: 400,
              msg: "Branch Wajib diisi!",
            });
          }
          const cekBranch = await BranchModel.findById(req.body.branch, [
            "_id",
            "status",
          ]);
          if (!cekBranch) {
            return res.status(404).json({
              status: 404,
              msg: "Branch tidak ditemukan!",
            });
          }
          if (cekBranch.status !== "1") {
            return res.status(400).json({
              status: 400,
              msg: "Branch tidak aktif!",
            });
          }
        }

        //Mengecek jika Customer Group dirubah
        if (req.body.customerGroup) {
          if (
            req.body.customerGroup == "" ||
            req.body.customerGroup == "null"
          ) {
            return res.status(400).json({
              status: 400,
              msg: "CustomerGroup Wajib diisi!",
            });
          }

          if (typeof req.body.customerGroup !== "string") {
            return res.status(404).json({
              status: 404,
              msg: "Error, Cek kembali data customerGroup, Data harus berupa string id customerGroup!",
            });
          }

          const CekCG: any = await CustomerGroupModel.findOne(
            {
              $and: [
                { _id: req.body.customerGroup },
                {
                  branch: {
                    $in: req.body.branch
                      ? [new ObjectId(req.body.branch)]
                      : [new ObjectId(result.branch)],
                  },
                },
              ],
            },
            ["_id", "status"]
          );

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
        }
        // End

        // Upload gambar
        if (req.file) {
          req.body.img = `${req.params.id}.jpg`;
          const compressedImage = path.join(
            __dirname,
            "../public/customers",
            `${req.params.id}.jpg`
          );
          sharp(req.file.path)
            .resize(640, 480, {
              fit: sharp.fit.inside,
              withoutEnlargement: true,
            })
            .jpeg({
              quality: 100,
              progressive: true,
              chromaSubsampling: "4:4:4",
            })
            .withMetadata()
            .toFile(compressedImage, async (err, info): Promise<any> => {
              if (err) {
                console.log(err);
              } else {
                console.log(info);
              }
            });
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
          if (req.body.unsetLocation === "true") {
            req.body["$unset"] = {
              location: "",
            };
          }
          await Db.updateOne({ _id: req.params.id }, req.body).populate(
            "createdBy",
            "name"
          );
        }

        const getData: any = await Db.findOne({
          _id: req.params.id,
        });

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
          .json({ status: 404, msg: "Error update, data tidak ditemukan!" });
      }
    } catch (error: any) {
      return res.status(404).json({ status: 404, data: error });
    }
  };

  delete = async (req: Request | any, res: Response): Promise<Response> => {
    try {
      const getData: any = await Db.findOne({ _id: req.params.id });

      if (!getData) {
        return res
          .status(404)
          .json({ status: 404, msg: "Error, Data tidak ditemukan!" });
      }

      const cekPermission = await cekValidPermission(
        req.userId,
        {
          user: getData.createdBy,
          group: getData.customerGroup,
          customer: getData._id,
          branch: getData.branch,
        },
        selPermissionType.CUSTOMER
      );

      if (!cekPermission) {
        return res.status(403).json({
          status: 403,
          msg: "Anda tidak mempunyai akses untuk dok ini!",
        });
      }

      // Cek apakah digunakan di permission data
      const permission = await PermissionModel.findOne(
        {
          $and: [
            { allow: "customer" },
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
          msg: "Customer ini sudah digunakan oleh data permission!",
        });
      }
      // End

      // if (getData.status === "1") {
      //   return res
      //     .status(404)
      //     .json({ status: 404, msg: "Error, status dokumen aktif!" });
      // }

      if (
        fs.existsSync(
          path.join(__dirname, "../public/customers/" + getData.img)
        )
      ) {
        fs.unlink(
          path.join(__dirname, "../public/customers/" + getData.img),
          function (err) {
            if (err && err.code == "ENOENT") {
              // file doens't exist
              console.log(err);
            } else if (err) {
              // other errors, e.g. maybe we don't have enough permission
              console.log("Error occurred while trying to remove file");
            } else {
              console.log(`removed`);
            }
          }
        );
      }
      const result = await Db.deleteOne({ _id: req.params.id });

      await ContactModel.deleteMany({
        customer: new ObjectId(req.params.id),
      });
      // await Redis.client.del(`${redisName}-${req.params.id}`);
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
      const pipelineNear: any[] = [
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
      ];

      if (data.customerId) {
        pipelineNear.push({ _id: data.customerId });
      }

      let result: any[] = await CustomerModel.find(
        {
          $and: pipelineNear,
        },
        { _id: 1, location: 1 }
      );

      if (data.withNoLocation) {
        let pipeline: any[] = [{ location: { $exists: false } }];

        if (data.customerId) {
          pipeline.push({ _id: data.customerId });
        }

        const noLocation: any[] = await CustomerModel.find(
          {
            $and: pipeline,
          },
          { _id: 1, location: 1 }
        );

        if (noLocation.length > 0) {
          result = [...result, ...noLocation];
        }
      }

      return result;
    } catch (error) {
      return [];
    }
  };

  importData = async (req: Request | any, res: Response): Promise<any> => {
    try {
      const data = await csv().fromFile(req.file.path);
      if (data.length > 0) {
        const validData = await Promise.all(
          data.map(async (item: any) => {
            let dup = await CustomerModel.findOne({ name: item.name }, [
              "name",
            ]);
            if (dup) {
              throw new Error(`Error duplicate for customer ${dup.name}`);
            }

            return { ...item, createdBy: req.userId };
          })
        );
        if (validData.length > 0) {
          const result = await Db.insertMany(validData);

          return res.status(200).json({ status: 400, data: result });
        } else {
          throw "No data";
        }
      } else {
        throw "No data";
      }
    } catch (error: any) {
      return res.status(400).json({ status: 400, msg: error.message });
    }
  };
}

export default new CustomerController();

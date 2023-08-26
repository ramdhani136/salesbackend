import { Request, Response } from "express";
// import Redis from "../config/Redis";
import { IStateFilter } from "../Interfaces";
import {
  CekKarakterSama,
  FilterQuery,
  HapusKarakter,
  PaddyData,
} from "../utils";
import IController from "./ControllerInterface";
import { TypeOfState } from "../Interfaces/FilterInterface";
import {
  BranchModel,
  CustomerGroupModel,
  MemoModel as Db,
  History,
  UserGroupListModel,
  UserGroupModel,
  namingSeriesModel,
} from "../models";
import { PermissionMiddleware } from "../middleware";
import {
  selPermissionAllow,
  selPermissionType,
} from "../middleware/PermissionMiddleware";
import { ObjectId } from "mongodb";
import HistoryController from "./HistoryController";
import WorkflowController from "./WorkflowController";
import fs from "fs";
import sharp from "sharp";
import path from "path";
import { ISearch } from "../utils/FilterQuery";

const redisName = "memo";

class MemoController implements IController {
  index = async (req: Request | any, res: Response): Promise<Response> => {
    const stateFilter: IStateFilter[] = [
      {
        alias: "Branch",
        name: "branch",
        operator: ["=", "!="],
        typeOf: TypeOfState.String,
      },
      {
        alias: "CustomerGroup",
        name: "customerGroup",
        operator: ["=", "!="],
        typeOf: TypeOfState.String,
      },
      {
        alias: "UserGroup",
        name: "userGroup",
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
        alias: "Display",
        name: "display",
        operator: ["=", "!="],
        typeOf: TypeOfState.String,
        listData: [
          { name: "Visit", value: "visit" },
          { name: "Callsheet", value: "callsheet" },
          { name: "Dahsboard", value: "dashboard" },
          { name: "Modal", value: "alert" },
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
          { value: "3", name: "Closed" },
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
        alias: "ActiveDate",
        name: "activeDate",
        operator: ["=", "!=", ">", "<", ">=", "<="],
        typeOf: TypeOfState.Date,
        isSort: true,
      },
      {
        alias: "ClosingDate",
        name: "closingDate",
        operator: ["=", "!=", ">", "<", ">=", "<="],
        typeOf: TypeOfState.Date,
        isSort: true,
      },
      {
        alias: "UpdatedAt",
        name: "updatedAt",
        operator: ["=", "!=", , ">", "<", ">=", "<="],
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
      const filters: any = req.query.filters
        ? JSON.parse(`${req.query.filters}`)
        : [];
      const fields: any = req.query.fields
        ? JSON.parse(`${req.query.fields}`)
        : [
            "name",
            "display",
            "updatedAt",
            "notes",
            "img",
            "activeDate",
            "closingDate",
            "status",
            "workflowState",
            "customerGroup",
            "branch",
            "userGroup",
            "title",
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
        "createdBy",
        "branch",
        "userGroup",
        "customerGroup",
        "_id",
      ]);

      if (!isFilter.status) {
        return res
          .status(400)
          .json({ status: 400, msg: "Error, Filter Invalid " });
      }
      // End

      let FinalFIlter: any = [isFilter.data];

      // Cek Branch
      // Mengecek permission user
      const userBranchPermission = await PermissionMiddleware.getPermission(
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

      if (branchPermission.length > 0 || userBranchPermission.length > 0) {
        let pipelineBranch: any = [];

        if (userBranchPermission.length > 0) {
          pipelineBranch.push({ createdBy: { $in: userBranchPermission } });
        }

        if (branchPermission.length > 0) {
          pipelineBranch.push({ _id: { $in: branchPermission } });
        }
        const branch = await BranchModel.find(
          { $and: pipelineBranch },
          { _id: 1 }
        );
        if (branch.length > 0) {
          const validBranch = branch.map((item) => item._id);

          FinalFIlter.unshift({
            $or: [{ branch: [] }, { branch: { $in: validBranch } }],
          });
        } else {
          FinalFIlter.unshift({
            $or: [{ branch: [] }],
          });
        }
      }

      // End

      // End

      // Mengecek customer Group
      // Mengambil rincian permission user
      const groupUserPermission = await PermissionMiddleware.getPermission(
        req.userId,
        selPermissionAllow.USER,
        selPermissionType.CUSTOMERGROUP
      );
      // End
      // Mengambil rincian permission branch
      const groupBanchPermission = await PermissionMiddleware.getPermission(
        req.userId,
        selPermissionAllow.BRANCH,
        selPermissionType.CUSTOMERGROUP
      );
      // End
      // Mengambil rincian permission customerGroup
      const groupGroupPermission = await PermissionMiddleware.getPermission(
        req.userId,
        selPermissionAllow.CUSTOMERGROUP,
        selPermissionType.CUSTOMERGROUP
      );
      // End

      if (
        groupUserPermission.length > 0 ||
        groupBanchPermission.length > 0 ||
        groupGroupPermission.length > 0
      ) {
        let pipelineGroup: any = [];

        if (groupUserPermission.length > 0) {
          pipelineGroup.push({ createdBy: { $in: groupUserPermission } });
        }

        if (groupBanchPermission.length > 0) {
          pipelineGroup.push({ branch: { $in: groupBanchPermission } });
        }

        if (groupGroupPermission.length > 0) {
          pipelineGroup.push({ _id: { $in: groupGroupPermission } });
        }
        const group = await CustomerGroupModel.find(
          { $and: pipelineGroup },
          { _id: 1 }
        );
        if (group.length > 0) {
          const validGroup = group.map((item) => item._id);
          FinalFIlter.unshift({
            $or: [
              { customerGroup: [] },
              { customerGroup: { $in: validGroup } },
            ],
          });
        } else {
          FinalFIlter.unshift({
            $or: [{ customerGroup: [] }],
          });
        }
      }

      // End

      // Cek userGroup
      const userGroupList = await UserGroupListModel.find(
        {
          user: new ObjectId(req.userId),
        },
        { userGroup: 1 }
      );

      if (userGroupList.length > 0) {
        const validUserGroup = userGroupList.map((item) => item.userGroup);

        FinalFIlter.unshift({
          $or: [{ userGroup: [] }, { userGroup: { $in: validUserGroup } }],
        });
      } else {
        FinalFIlter.unshift({
          $or: [{ userGroup: [] }],
        });
      }
      // End

      const getAll = await Db.find({ $and: FinalFIlter }, setField).count();

      const result = await Db.find({ $and: FinalFIlter }, setField)
        .sort(order_by)
        .limit(limit)
        .skip(limit > 0 ? page * limit - limit : 0)
        .populate("createdBy", "name")
        .populate("branch", "name")
        .populate("customerGroup", "name")
        .populate("userGroup", "name");

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
        msg: "Data tidak ditemukan!",
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
      req.body.display = JSON.parse(req.body.display);

      if (
        !Array.isArray(req.body.display) ||
        req.body.display.some(
          (tag: any) =>
            !["visit", "callsheet", "dashboard", "alert"].includes(tag)
        )
      ) {
        return res
          .status(400)
          .json({ error: "Display harus array dengan data yang ditentukan!." });
      }

      // Jika display terdapat dashboard maka gambar wajib diupload
      if (req.body.display.includes("dashboard") && !req.file) {
        return res.status(400).json({
          status: 400,
          msg: "Wajib melampirkan gambar ketika memilih display dashboard",
        });
      }

      // Jika display terdapat m maka gambar wajib diupload
      if (req.body.display.includes("alert") && !req.file) {
        return res.status(400).json({
          status: 400,
          msg: "Wajib melampirkan gambar ketika memilih display modal",
        });
      }

      // End

      // Cek Branch
      req.body.branch = JSON.parse(req.body.branch);
      if (req.body.branch.length > 0) {
        for (const branch of req.body.branch) {
          const ada = await BranchModel.findById(branch, ["name", "status"]);

          if (!ada) {
            return res.status(400).json({
              status: 400,
              msg: "Branch tidak ditemukan",
            });
          }
          if (ada.status !== "1") {
            return res.status(400).json({
              status: 400,
              msg: `Branch ${ada.name} tidak aktif`,
            });
          }
        }
      }
      // End

      // Cek Group
      req.body.customerGroup = JSON.parse(req.body.customerGroup);
      if (req.body.customerGroup.length > 0) {
        for (const customerGroup of req.body.customerGroup) {
          const ada = await CustomerGroupModel.findById(customerGroup, [
            "name",
            "status",
          ]);

          if (!ada) {
            return res.status(400).json({
              status: 400,
              msg: "Customer Group tidak ditemukan",
            });
          }
          if (ada.status !== "1") {
            return res.status(400).json({
              status: 400,
              msg: `Customer Group ${ada.name} tidak aktif`,
            });
          }
        }
      }
      // End

      // Cek Group
      req.body.userGroup = JSON.parse(req.body.userGroup);
      if (req.body.userGroup.length > 0) {
        for (const userGroup of req.body.userGroup) {
          const ada = await UserGroupModel.findById(userGroup, [
            "name",
            "status",
          ]);

          if (!ada) {
            return res.status(400).json({
              status: 400,
              msg: "User Group tidak ditemukan",
            });
          }
          if (ada.status !== "1") {
            return res.status(400).json({
              status: 400,
              msg: `User Group ${ada.name} tidak aktif`,
            });
          }
        }
      }
      // End

      if (!req.body.title) {
        return res
          .status(400)
          .json({ status: 400, msg: "Error, title wajib diisi!" });
      }
      if (!req.body.notes) {
        return res
          .status(400)
          .json({ status: 400, msg: "Error, notes wajib diisi!" });
      }

      if (!req.body.activeDate || req.body.activeDate == "null") {
        return res
          .status(400)
          .json({ status: 400, msg: "Error, activeDate wajib diisi!" });
      }
      if (!req.body.closingDate || req.body.closingDate == "null") {
        return res
          .status(400)
          .json({ status: 400, msg: "Error, closingDate wajib diisi!" });
      }

      // Set nama/nomor doc
      // Cek naming series
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
        $and: [{ _id: req.body.namingSeries }, { doc: "memo" }],
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

      const memo = await Db.findOne({
        $and: [
          { name: { $regex: regex } },
          {
            $where: `this.name.length === ${
              ambilIndex ? jumlahKarakter : jumlahKarakter + 4
            }`,
          },
        ],
      })
        .sort({ createdAt: -1 })
        .exec();

      if (memo) {
        latest = parseInt(
          `${memo.name.slice(ambilIndex ? -ambilIndex.length : -4)}`
        );
      }

      req.body.name = ambilIndex
        ? olahKata.join("") +
          PaddyData(latest + 1, ambilIndex.length).toString()
        : olahKata.join("") + PaddyData(latest + 1, 4).toString();
      // End set name

      req.body.createdBy = req.userId;

      const result = new Db(req.body);

      const response: any = await result.save({});

      // Upload image ketik dashboard
      if (req.file) {
        const compressedImage = path.join(
          __dirname,
          "../public/memo",
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

      //push history
      await HistoryController.pushHistory({
        document: {
          _id: response._id,
          name: response.name,
          type: redisName,
        },
        message: `${req.user} menambahkan memo ${response.name} `,
        user: req.userId,
      });
      //End

      return res.status(200).json({ status: 200, data: response });
    } catch (error) {
      if (req.file) {
        // Jika pembuatan memo gagal, hapus foto yang telah di-upload
        fs.unlinkSync(req.file.path);
        if (fs.existsSync(path.join(__dirname, req.file.path))) {
          fs.unlinkSync(req.file.path);
        }
        // End
      }
      return res
        .status(400)
        .json({ status: 400, msg: error ?? "Error Connection!" });
    }
  };

  protected checkBranch = async (
    userId: string,
    data: any[]
  ): Promise<boolean> => {
    // Cek Branch
    // Mengecek permission user

    const userBranchPermission = await PermissionMiddleware.getPermission(
      userId,
      selPermissionAllow.USER,
      selPermissionType.BRANCH
    );
    // End

    // Mengecek permission branch
    const branchPermission = await PermissionMiddleware.getPermission(
      userId,
      selPermissionAllow.BRANCH,
      selPermissionType.BRANCH
    );

    if (branchPermission.length > 0 || userBranchPermission.length > 0) {
      let pipelineBranch: any = [];

      if (userBranchPermission.length > 0) {
        pipelineBranch.push({ createdBy: { $in: userBranchPermission } });
      }

      if (branchPermission.length > 0) {
        pipelineBranch.push({ _id: { $in: branchPermission } });
      }
      const branch = await BranchModel.find(
        { $and: pipelineBranch },
        { _id: 1 }
      );
      if (branch.length > 0) {
        const validBranch = branch.map((item) => item._id);
        const parseString: any[] = validBranch.map((i) => {
          return `${i}`;
        });

        const found = data.some((item: any) => {
          return parseString.includes(`${item._id}`);
        });

        return found;
      } else {
        return false;
      }
    }

    return true;
    // End
  };

  protected checkGroup = async (
    userId: string,
    data: any[]
  ): Promise<boolean> => {
    // Mengambil rincian permission user
    const groupUserPermission = await PermissionMiddleware.getPermission(
      userId,
      selPermissionAllow.USER,
      selPermissionType.CUSTOMERGROUP
    );
    // End
    // Mengambil rincian permission branch
    const groupBanchPermission = await PermissionMiddleware.getPermission(
      userId,
      selPermissionAllow.BRANCH,
      selPermissionType.CUSTOMERGROUP
    );
    // End
    // Mengambil rincian permission customerGroup
    const groupGroupPermission = await PermissionMiddleware.getPermission(
      userId,
      selPermissionAllow.CUSTOMERGROUP,
      selPermissionType.CUSTOMERGROUP
    );
    // End

    if (
      groupUserPermission.length > 0 ||
      groupBanchPermission.length > 0 ||
      groupGroupPermission.length > 0
    ) {
      let pipelineGroup: any = [];

      if (groupUserPermission.length > 0) {
        pipelineGroup.push({ createdBy: { $in: groupUserPermission } });
      }

      if (groupBanchPermission.length > 0) {
        pipelineGroup.push({ branch: { $in: groupBanchPermission } });
      }

      if (groupGroupPermission.length > 0) {
        pipelineGroup.push({ _id: { $in: groupGroupPermission } });
      }
      const group = await CustomerGroupModel.find(
        { $and: pipelineGroup },
        { _id: 1 }
      );
      if (group.length > 0) {
        const validGroup = group.map((item) => item._id);
        const parseString: any[] = validGroup.map((i) => {
          return `${i}`;
        });

        const found = data.some((item: any) => {
          return parseString.includes(`${item._id}`);
        });

        return found;
      } else {
        return false;
      }
    }
    return true;
  };

  protected CheckUserGroup = async (
    userId: string,
    data: any[]
  ): Promise<any> => {
    // Cek userGroup
    const userGroupList = await UserGroupListModel.find(
      {
        user: new ObjectId(userId),
      },
      { userGroup: 1 }
    );

    if (userGroupList.length > 0) {
      const validUserGroup = userGroupList.map((item) => item.userGroup);

      const parseString: any[] = validUserGroup.map((i) => {
        return `${i}`;
      });

      const found = data.some((item: any) => {
        return parseString.includes(`${item._id}`);
      });

      return found;
    } else {
      return false;
    }
    // End
  };

  show = async (req: Request | any, res: Response): Promise<Response> => {
    try {
      const result: any = await Db.findOne({
        _id: req.params.id,
      })
        .populate("createdBy", "name")
        .populate("branch", "name")
        .populate("customerGroup", "name")
        .populate("userGroup", "name");

      if (!result) {
        return res
          .status(404)
          .json({ status: 404, msg: "Error, Data tidak ditemukan!" });
      }

      // // Cek Branch
      const branch = result.branch;

      if (branch.length > 0) {
        const validBranch = branch.map((item: any) => item._id);
        const cekBranch: any = await this.checkBranch(req.userId, validBranch);

        if (!cekBranch) {
          return res.status(404).json({
            status: 404,
            msg: "Error,Anda tidak memiliki akses dokumen ini!",
          });
        }
      }
      // End

      // Cek customerGroup
      const group = result.customerGroup;

      if (group.length > 0) {
        const validGroup = group.map((item: any) => item._id);
        const cekGroup: any = await this.checkGroup(req.userId, validGroup);

        if (!cekGroup) {
          return res.status(404).json({
            status: 404,
            msg: "Error,Anda tidak memiliki akses dokumen ini!",
          });
        }
      }
      // End

      // Cek customerGroup
      const userGroup = result.userGroup;

      if (userGroup.length > 0) {
        const validUg = userGroup.map((item: any) => item._id);
        const cegUG: any = await this.CheckUserGroup(req.userId, validUg);

        if (!cegUG) {
          return res.status(404).json({
            status: 404,
            msg: "Error,Anda tidak memiliki akses dokumen ini!",
          });
        }
      }
      // End

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
      return res.status(404).json({ status: 404, msg: error });
    }
  };

  update = async (req: Request | any, res: Response): Promise<any> => {
    // Validasi yang tidak boleh di rubah
    if (req.body.createdBy) {
      return res.status(404).json({
        status: 404,
        msg: "Error, Tidak dapat merubah data createdBy!",
      });
    }
    if (req.body.name) {
      return res.status(404).json({
        status: 404,
        msg: "Error, Tidak dapat merubah nomor dokumen!",
      });
    }

    if (req.body.img) {
      return res.status(404).json({
        status: 404,
        msg: "Error, Tidak dapat merubah img name!",
      });
    }

    try {
      const result: any = await Db.findOne({
        _id: req.params.id,
      });

      if (result) {
        if (req.body.display) {
          req.body.display = JSON.parse(req.body.display);

          if (
            !Array.isArray(req.body.display) ||
            req.body.display.some(
              (tag: any) =>
                !["visit", "callsheet", "dashboard", "alert"].includes(tag)
            )
          ) {
            return res.status(400).json({
              error: "Display harus array dengan data yang ditentukan!.",
            });
          }

          // Jika display terdapat dashboard maka gambar wajib diupload
          if (
            req.body.display.includes("dashboard") &&
            !req.file &&
            !result.img
          ) {
            return res.status(400).json({
              status: 400,
              msg: "Wajib melampirkan gambar ketika memilih display dashboard",
            });
          }

          // Jika display terdapat m maka gambar wajib diupload
          if (req.body.display.includes("alert") && !req.file && !result.img) {
            return res.status(400).json({
              status: 400,
              msg: "Wajib melampirkan gambar ketika memilih display modal",
            });
          }

          // End
        }

        if (req.body.branch) {
          // Cek Branch
          req.body.branch = JSON.parse(req.body.branch);
          if (req.body.branch.length > 0) {
            for (const branch of req.body.branch) {
              const ada = await BranchModel.findById(branch, [
                "name",
                "status",
              ]);

              if (!ada) {
                return res.status(400).json({
                  status: 400,
                  msg: "Branch tidak ditemukan",
                });
              }
              if (ada.status !== "1") {
                return res.status(400).json({
                  status: 400,
                  msg: `Branch ${ada.name} tidak aktif`,
                });
              }
            }
          }
          // End
        }

        if (req.body.customerGroup) {
          // Cek Group
          req.body.customerGroup = JSON.parse(req.body.customerGroup);
          if (req.body.customerGroup.length > 0) {
            for (const customerGroup of req.body.customerGroup) {
              const ada = await CustomerGroupModel.findById(customerGroup, [
                "name",
                "status",
              ]);

              if (!ada) {
                return res.status(400).json({
                  status: 400,
                  msg: "Customer Group tidak ditemukan",
                });
              }
              if (ada.status !== "1") {
                return res.status(400).json({
                  status: 400,
                  msg: `Customer Group ${ada.name} tidak aktif`,
                });
              }
            }
          }
          // End
        }

        if (req.body.userGroup) {
          // Cek Group
          req.body.userGroup = JSON.parse(req.body.userGroup);
          if (req.body.userGroup.length > 0) {
            for (const userGroup of req.body.userGroup) {
              const ada = await UserGroupModel.findById(userGroup, [
                "name",
                "status",
              ]);

              if (!ada) {
                return res.status(400).json({
                  status: 400,
                  msg: "User Group tidak ditemukan",
                });
              }
              if (ada.status !== "1") {
                return res.status(400).json({
                  status: 400,
                  msg: `User Group ${ada.name} tidak aktif`,
                });
              }
            }
          }
          // End
        }

        if (req.body.title) {
          if (req.body.title === "" || req.body.title === "null") {
            return res
              .status(400)
              .json({ status: 400, msg: "Error, title wajib diisi!" });
          }
        }

        if (req.body.notes) {
          if (!req.body.notes || req.body.notes === "null") {
            return res
              .status(400)
              .json({ status: 400, msg: "Error, notes wajib diisi!" });
          }
        }

        if (req.body.activeDate) {
          if (req.body.activeDate === "" || req.body.activeDate == "null") {
            return res
              .status(400)
              .json({ status: 400, msg: "Error, activeDate wajib diisi!" });
          }
        }
        if (req.body.closingDate) {
          if (req.body.closingDate == "" || req.body.closingDate == "null") {
            return res
              .status(400)
              .json({ status: 400, msg: "Error, closingDate wajib diisi!" });
          }
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
        });

        // Upload data ketika outsite
        if (req.file) {
          const compressedImage = path.join(
            __dirname,
            "../public/memo",
            getData.img
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
          .json({ status: 404, msg: "Error update, Data tidak di temukan!" });
      }
    } catch (error: any) {
      return res.status(404).json({ status: 404, msg: error });
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

      if (getData.status === "1") {
        return res
          .status(404)
          .json({ status: 404, msg: "Error, status dokumen aktif!" });
      }

      const result: any = await Db.deleteOne({ _id: req.params.id });

      if (
        fs.existsSync(path.join(__dirname, "../public/memo/" + getData.img))
      ) {
        fs.unlink(
          path.join(__dirname, "../public/memo/" + getData.img),
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
      // await Redis.client.del(`${redisName}-${req.params.id}`);
      return res.status(200).json({ status: 200, data: result });
    } catch (error) {
      return res.status(404).json({ status: 404, msg: error });
    }
  };
}

export default new MemoController();

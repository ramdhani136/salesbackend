import { Request, Response } from "express";
// import Redis from "../config/Redis";
import { IStateFilter } from "../Interfaces";
import { TypeOfState } from "../Interfaces/FilterInterface";
import User from "../models/UserModel";
import { FilterQuery, cekValidPermission } from "../utils";
import IController from "./ControllerInterface";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { History, PermissionModel } from "../models";
import HistoryController from "./HistoryController";
import { ISearch } from "../utils/FilterQuery";
import sharp from "sharp";
import path from "path";
import fs from "fs";

import WorkflowController from "./WorkflowController";
import { ObjectId } from "mongodb";
import { PermissionMiddleware } from "../middleware";
import {
  selPermissionAllow,
  selPermissionType,
} from "../middleware/PermissionMiddleware";

class UserController implements IController {
  protected prosesUpload = (req: Request | any, name: string) => {
    const compressedImage = path.join(__dirname, "../public/users", `${name}`);
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
      .toFile(compressedImage, (err, info) => {
        if (err) {
          console.log(err);
        } else {
          console.log(info);
        }
      });
  };

  index = async (req: Request | any, res: Response): Promise<Response> => {
    const stateFilter: IStateFilter[] = [
      {
        alias: "Id",
        name: "_id",
        operator: ["=", "!=", "like", "notlike"],
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
        alias: "Username",
        name: "username",
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
        alias: "Phone",
        name: "phone",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
        isSort: true,
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
        : ["name"];
      const order_by: any = req.query.order_by
        ? JSON.parse(`${req.query.order_by}`)
        : { updatedAt: -1 };
      const limit: number | string = parseInt(`${req.query.limit}`) || 0;
      let page: number | string = parseInt(`${req.query.page}`) || 1;

      let search: ISearch = {
        filter: ["name", "username"],
        value: req.query.search || "",
      };

      // Mengambil hasil fields
      let setField = FilterQuery.getField(fields);
      // End

      // Mengambil hasil filter
      let isFilter = FilterQuery.getFilter(filters, stateFilter, search);
      // End

      // Validasi apakah filter valid
      if (!isFilter.status) {
        return res
          .status(400)
          .json({ status: 400, msg: "Error, Filter Invalid " });
      }
      // End

      // Mengambil rincian permission user
      const userPermission = await PermissionMiddleware.getPermission(
        req.userId,
        selPermissionAllow.USER,
        selPermissionType.USER
      );
      // End

      let pipeline: any = [isFilter.data];

      if (userPermission.length > 0) {
        pipeline.push({
          $or: [
            {
              _id: { $in: userPermission.map((id) => new ObjectId(id)) },
            },
            { _id: new ObjectId(req.userId) },
          ],
        });
      }

      const getAll = await User.find({ $and: pipeline }).count();
      const users = await User.find({ $and: pipeline }, setField)
        .skip(page * limit - limit)
        .limit(limit)
        .sort(order_by);

      if (users.length > 0) {
        return res.status(200).json({
          status: 200,
          total: getAll,
          limit,
          nextPage: page + 1,
          hasMore: getAll >= page * limit ? true : false,
          data: users,
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
    if (!req.body.username) {
      return res
        .status(400)
        .json({ status: 400, msg: "Username wajib diisi!" });
    }
    if (!req.body.password) {
      return res
        .status(400)
        .json({ status: 400, msg: "Password Wajib diisi!" });
    }

    const salt = await bcrypt.genSalt();
    req.body.username = req.body.username.toLowerCase();
    req.body.password = await bcrypt.hash(req.body.password, salt);

    try {
      const user = new User(req.body);
      const users: any = await user.save();

      const resultData: any = await User.findOne(
        { _id: new Object(users._id) },
        { password: 0 }
      );

      // await Redis.client.set(`user-${users._id}`, JSON.stringify(resultData), {
      //   EX: 10,
      // });
      // push history
      await HistoryController.pushHistory({
        document: {
          _id: req.userId,
          name: req.user,
          type: "user",
        },
        message: `${req.user} membuat user baru ${users.name}`,
        user: req.userId,
      });
      // End

      return res.status(200).json({ status: 200, data: resultData });
    } catch (error) {
      if (req.file) {
        // Jika pembuatan user gagal, hapus foto yang telah di-upload
        fs.unlinkSync(req.file.path);
        if (fs.existsSync(path.join(__dirname, req.file.path))) {
          fs.unlinkSync(req.file.path);
        }
        // End
      }
      return res.status(400).json({ status: 400, data: error });
    }
  };

  show = async (req: Request | any, res: Response): Promise<Response> => {
    try {
      // const cache = await Redis.client.get(`user-${req.params.id}`);
      // if (cache) {
      //   const isCache = JSON.parse(cache);

      //   const cekPermission = await cekValidPermission(
      //     req.userId,
      //     {
      //       user: isCache._id,
      //     },
      //     selPermissionType.USER
      //   );

      //   if (!cekPermission) {
      //     if (`${req.userId}` !== `${isCache._id}`) {
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
      //         { "document.type": "user" },
      //       ],
      //     },
      //     ["_id", "user", "message", "createdAt", "updatedAt"]
      //   )
      //     .sort({ createdAt: -1 })
      //     .populate("user", "name");
      //   return res
      //     .status(200)
      //     .json({ status: 200, data: JSON.parse(cache), history: getHistory });
      // }
      const users: any = await User.findOne(
        { _id: req.params.id },
        { password: 0 }
      );

      if (!users) {
        return res
          .status(404)
          .json({ status: 404, msg: "Error, User tidak ditemukan!" });
      }

      const cekPermission = await cekValidPermission(
        req.userId,
        {
          user: users._id,
        },
        selPermissionType.USER
      );

      if (!cekPermission) {
        if (`${req.userId}` !== `${req.params.id}`) {
          return res.status(403).json({
            status: 403,
            msg: "Anda tidak mempunyai akses untuk dok ini!",
          });
        }
      }

      const buttonActions = await WorkflowController.getButtonAction(
        "user",
        req.userId,
        users.workflowState
      );

      const getHistory = await History.find(
        {
          $and: [{ "document._id": users._id }, { "document.type": "user" }],
        },
        ["_id", "user", "message", "createdAt", "updatedAt"]
      )
        .sort({ createdAt: -1 })
        .populate("user", "name");
      // await Redis.client.set(`user-${req.params.id}`, JSON.stringify(users));
      return res.status(200).json({
        status: 200,
        data: users,
        history: getHistory,
        workflow: buttonActions,
      });
    } catch (error) {
      return res.status(404).json({ status: 404, data: error });
    }
  };

  update = async (req: Request | any, res: Response): Promise<Response> => {
    const cekPermission = await cekValidPermission(
      req.userId,
      {
        user: req.params.id,
      },
      selPermissionType.USER
    );

    if (!cekPermission) {
      if (`${req.userId}` !== `${req.params.id}`) {
        return res.status(403).json({
          status: 403,
          msg: "Anda tidak mempunyai akses untuk dok ini!",
        });
      }
    }

    // tidak dapat diubah
    if (req.body.img) {
      return res.status(400).json({
        status: 404,
        msg: "Error update, nama img tidak dapat dirubah",
      });
    }

    // End

    // Mulai transaksi;
    try {
      if (req.body.password) {
        const salt = await bcrypt.genSalt();
        req.body.password = await bcrypt.hash(req.body.password, salt);
      }

      const user: any = await User.findOne(
        { _id: req.params.id },
        { password: 0 }
      );

      if (!user) {
        return res
          .status(400)
          .json({ status: 404, msg: "Error update, user tidak ditemukan" });
      }

      if (req.file != undefined) {
        let istitik = req.file.originalname.indexOf(".");
        let typeimage = req.file.originalname.slice(istitik, 200);
        this.prosesUpload(req, `${req.params.id}${typeimage}`);
        req.body.img = `${req.params.id}${typeimage}`;
      }

      if (req.body.nextState) {
        const checkedWorkflow = await WorkflowController.permissionUpdateAction(
          "user",
          req.userId,
          req.body.nextState,
          user.createdBy
        );

        if (checkedWorkflow.status) {
          await User.updateOne({ _id: req.params.id }, checkedWorkflow.data);
        } else {
          return res
            .status(403)
            .json({ status: 403, msg: checkedWorkflow.msg });
        }
      } else {
        await User.updateOne({ _id: req.params.id }, req.body);
      }

      const resultData: any = await User.findOne(
        { _id: req.params.id },
        { password: 0 }
      );

      // await Redis.client.set(
      //   `user-${req.params.id}`,
      //   JSON.stringify(resultData)
      // );
      // push history semua field yang di update
      await HistoryController.pushUpdateMany(
        user,
        resultData,
        req.user,
        req.userId,
        "user"
      );
      // End

      return res.status(200).json({ status: 200, data: resultData });
    } catch (error: any) {
      return res.status(404).json({ status: 404, msg: error });
    }
  };

  delete = async (req: Request | any, res: Response): Promise<Response> => {
    try {
      const cekPermission = await cekValidPermission(
        req.userId,
        {
          user: req.params.id,
        },
        selPermissionType.USER
      );

      if (!cekPermission) {
        if (`${req.userId}` !== `${req.params.id}`) {
          return res.status(403).json({
            status: 403,
            msg: "Anda tidak mempunyai akses untuk dok ini!",
          });
        }
      }

      // Cek apakah digunakan di permission data
      const permission = await PermissionModel.findOne(
        {
          $and: [
            { allow: "user" },
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
          msg: "User ini sudah digunakan oleh data permission!",
        });
      }
      // End

      const users = await User.findOneAndDelete({ _id: req.params.id });
      if (users) {
        // await Redis.client.del(`user-${req.params.id}`);
        // push history
        await HistoryController.pushHistory({
          document: {
            _id: users._id,
            name: users.name,
            type: "user",
          },
          message: `${req.user} menghapus user ${users.name}`,
          user: req.userId,
        });
        // End

        return res.status(200).json({ status: 200, data: users });
      }
      return res.status(404).json({ status: 404, msg: "Error Delete!" });
    } catch (error) {
      return res.status(404).json({ status: 404, data: error });
    }
  };

  login = async (req: Request, res: Response): Promise<Response> => {
    if (!req.body.username) {
      return res
        .status(400)
        .json({ status: 400, msg: "Username wajib diisi!" });
    }
    if (!req.body.password) {
      return res
        .status(400)
        .json({ status: 400, msg: "Password wajib diiis!" });
    }
    try {
      const result: any = await User.findOne({
        $and: [{ username: req.body.username.toLowerCase() }, { status: "1" }],
      });
      if (!result) {
        return res.status(400).json({ status: 400, msg: "User not found" });
      }
      const match = await bcrypt.compare(req.body.password, result.password);
      if (!match) {
        return res.status(400).json({ status: 400, msg: "Password salah!" });
      }
      const accessToken = jwt.sign(
        {
          _id: result.id,
          name: result.name,
          username: result.username,
          status: result.status,
        },
        `${process.env.ACCESS_TOKEN_SECRET}`
        // {
        //   expiresIn: "1d",
        // }
      );
      const refreshToken = jwt.sign(
        {
          _id: result.id,
          name: result.name,
          username: result.username,
          status: result.status,
        },
        `${process.env.REFRESH_TOKEN_SECRET}`
        // {
        //   expiresIn: "1d",
        // }
      );

      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        maxAge: 20 * 60 * 60 * 1000,
        // secure:true
      });
      return res.status(200).json({ status: 200, token: accessToken });
    } catch (error) {
      return res
        .status(400)
        .json({ status: 400, msg: error ?? "Error, Connection" });
    }
  };

  logout = async (req: Request, res: Response): Promise<Response> => {
    try {
      res.clearCookie("refreshToken");
      return res.status(200).json({ status: 200, msg: "Logout success!" });
    } catch (error) {
      return res
        .status(400)
        .json({ status: 400, msg: error ?? "Error, Connection" });
    }
  };

  refreshToken = async (req: Request, res: Response): Promise<any> => {
    try {
      let refreshToken;
      if (!req.cookies.refreshToken) {
        if (req.header("refreshToken")) {
          refreshToken = req.header("refreshToken");
        }
      } else {
        refreshToken = req.cookies.refreshToken;
      }
      if (!refreshToken) {
        return res.status(401).json({
          status: 401,
          msg: "Unauthorized",
        });
      }
      jwt.verify(
        refreshToken,
        `${process.env.REFRESH_TOKEN_SECRET}`,
        async (err: any, decoded: any): Promise<Response> => {
          if (err)
            return res.status(403).json({
              status: 403,
              msg: "Forbiden, you have to login to access the data!",
            });
          const user = await User.findOne({ _id: decoded._id });
          if (!user) {
            return res.status(404).json({
              status: 404,
              msg: "Error, User not found!",
            });
          }
          const accessToken = jwt.sign(
            {
              _id: user.id,
              name: user.name,
              username: user.username,
              status: user.status,
            },
            `${process.env.ACCESS_TOKEN_SECRET}`,
            {
              expiresIn: "15s",
            }
          );
          return res.status(200).json({ status: 200, token: accessToken });
        }
      );
    } catch (error) {
      return res
        .status(400)
        .json({ status: 400, msg: error ?? "Error, Connection" });
    }
  };

  checkUserRegistered = async (id: string): Promise<Boolean> => {
    try {
      const user: any = await User.findOne({
        $and: [{ _id: id }, { status: "1" }],
      });
      if (user) {
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  };

  // protected DeleteRelatedUser = async (id: string): Promise<any> => {
  //   // roleuser
  //   try {
  //     await RoleUserModel.deleteMany({
  //       user: new ObjectId(id),
  //     });
  //   } catch (error) {
  //     throw error;
  //   }
  //   // End

  //   // Permission
  //   try {
  //     await PermissionModel.deleteMany({
  //       user: new ObjectId(id),
  //     });
  //   } catch (error) {
  //     throw error;
  //   }
  //   // End
  // };
}

export default new UserController();

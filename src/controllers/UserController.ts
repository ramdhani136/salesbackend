import { Request, Response } from "express";
import Redis from "../config/Redis";
import { IStateFilter } from "../Interfaces";
import { TypeOfState } from "../Interfaces/FilterInterface";
import User from "../models/User";
import { FilterQuery } from "../utils";
import IController from "./ControllerInterface";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { History } from "../models";
import HistoryController from "./HistoryController";
import { ISearch } from "../utils/FilterQuery";

class UserController implements IController {
  index = async (req: Request, res: Response): Promise<Response> => {
    const stateFilter: IStateFilter[] = [
      {
        name: "_id",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
      },
      {
        name: "name",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
      },
      {
        name: "username",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
      },
      {
        name: "email",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
      },
      {
        name: "status",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
      },
      {
        name: "updatedAt",
        operator: ["=", "!=", "like", "notlike", ">", "<", ">=", "<="],
        typeOf: TypeOfState.Date,
      },
      {
        name: "createdAt",
        operator: ["=", "!=", "like", "notlike", ">", "<", ">=", "<="],
        typeOf: TypeOfState.Date,
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
      const limit: number | string = parseInt(`${req.query.limit}`) || 10;
      let page: number | string = parseInt(`${req.query.page}`) || 1;


      let search: ISearch = {
        filter: ["name", "username"],
        value: req.query.search || "",
      };

      // Mengambil hasil fields
      let setField = FilterQuery.getField(fields);
      // End

      // Mengambil hasil filter
      let isFilter = FilterQuery.getFilter(filters, stateFilter,search);
      // End

      // Validasi apakah filter valid
      if (!isFilter.status) {
        return res
          .status(400)
          .json({ status: 400, msg: "Error, Filter Invalid " });
      }
      // End

      const getAll = await User.find(isFilter.data).count();
      const users = await User.find(isFilter.data, setField)
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
    if (!req.body.password) {
      return res.status(400).json({ status: 400, msg: "Password Required!" });
    }
    if (!req.body.name) {
      return res.status(400).json({ status: 400, msg: "Name Required!" });
    }
    if (!req.body.username) {
      return res.status(400).json({ status: 400, msg: "Username Required!" });
    }

    const salt = await bcrypt.genSalt();
    req.body.username = req.body.username.toLowerCase();
    req.body.password = await bcrypt.hash(req.body.password, salt);
    try {
      const user = new User(req.body);
      const users = await user.save();
      await Redis.client.set(`user-${users._id}`, JSON.stringify(users), {
        EX: 10,
      });
      // push history
      await HistoryController.pushHistory({
        document: {
          _id: users._id,
          name: users.name,
          type: "user",
        },
        message: `${req.user} membuat user baru ${users.name}`,
        user: req.userId,
      });
      // End

      return res.status(200).json({ status: 200, data: users });
    } catch (error) {
      return res.status(400).json({ status: 400, data: error });
    }
  };

  show = async (req: Request, res: Response): Promise<Response> => {
    try {
      const cache = await Redis.client.get(`user-${req.params.id}`);
      if (cache) {
        const isCache = JSON.parse(cache);
        const getHistory = await History.find(
          {
            $and: [
              { "document._id": `${isCache._id}` },
              { "document.type": "user" },
            ],
          },
          ["_id", "user", "message", "createdAt", "updatedAt"]
        )
          .sort({ createdAt: -1 })
          .populate("user", "name");
        return res
          .status(200)
          .json({ status: 200, data: JSON.parse(cache), history: getHistory });
      }
      const users: any = await User.findOne({ _id: req.params.id });
      const getHistory = await History.find(
        {
          $and: [{ "document._id": users._id }, { "document.type": "user" }],
        },
        ["_id", "user", "message", "createdAt", "updatedAt"]
      )
        .sort({ createdAt: -1 })
        .populate("user", "name");
      await Redis.client.set(`user-${req.params.id}`, JSON.stringify(users));
      return res
        .status(200)
        .json({ status: 200, data: users, history: getHistory });
    } catch (error) {
      return res.status(404).json({ status: 404, data: error });
    }
  };

  update = async (req: Request | any, res: Response): Promise<Response> => {
    try {
      const result = await User.findOneAndUpdate(
        { _id: req.params.id },
        req.body
      );
      if (result) {
        const users = await User.findOne({ _id: req.params.id });
        await Redis.client.set(`user-${req.params.id}`, JSON.stringify(users));
        // push history semua field yang di update
        await HistoryController.pushUpdateMany(
          result,
          users,
          req.user,
          req.userId,
          "user"
        );
        // End

        return res.status(200).json({ status: 200, data: users });
      }
      return res
        .status(400)
        .json({ status: 404, data: "Error update, user not found" });
    } catch (error: any) {
      return res.status(404).json({ status: 404, data: error });
    }
  };

  delete = async (req: Request | any, res: Response): Promise<Response> => {
    try {
      const users = await User.findOneAndDelete({ _id: req.params.id });
      if (users) {
        await Redis.client.del(`user-${req.params.id}`);
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
      return res.status(400).json({ status: 400, msg: "Username Required!" });
    }
    if (!req.body.password) {
      return res.status(400).json({ status: 400, msg: "Password Required!" });
    }
    try {
      const result: any = await User.findOne({
        $and: [{ username: req.body.username.toLowerCase() }],
      });
      if (!result) {
        return res.status(400).json({ status: 400, msg: "User not found" });
      }
      const match = await bcrypt.compare(req.body.password, result.password);
      if (!match) {
        return res.status(400).json({ status: 400, msg: "Wrong password" });
      }
      const accessToken = jwt.sign(
        {
          _id: result.id,
          name: result.name,
          username: result.username,
          status: result.status,
        },
        `${process.env.ACCESS_TOKEN_SECRET}`,
        {
          expiresIn: "1d",
        }
      );
      const refreshToken = jwt.sign(
        {
          _id: result.id,
          name: result.name,
          username: result.username,
          status: result.status,
        },
        `${process.env.REFRESH_TOKEN_SECRET}`,
        {
          expiresIn: "1d",
        }
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
}

export default new UserController();

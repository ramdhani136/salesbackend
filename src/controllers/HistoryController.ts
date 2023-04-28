import { Request, Response } from "express";
import Redis from "../config/Redis";
import { IStateFilter } from "../Interfaces";
import { FilterQuery } from "../utils";
import IController from "./ControllerInterface";
import { TypeOfState } from "../Interfaces/FilterInterface";
import { History } from "../models";

const Db = History;
const redisName = "history";

interface pushHistoryI {
  document: {
    _id: any;
    name: String;
    type: string;
  };
  message: String;
  user: String;
}

export interface responseHistoryI {
  status: Boolean;
  msg: any;
}

class HistoryController implements IController {
  index = async (req: Request, res: Response): Promise<Response> => {
    const stateFilter: IStateFilter[] = [
      {
        name: "_id",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
      },
      {
        name: "user.name",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
      },
      {
        name: "document.type",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
      },
      {
        name: "message",
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
      const filters: any = req.query.filters
        ? JSON.parse(`${req.query.filters}`)
        : [];
      const fields: any = req.query.fields
        ? JSON.parse(`${req.query.fields}`)
        : ["document", "user.name", "message", "status"];
      const order_by: any = req.query.order_by
        ? JSON.parse(`${req.query.order_by}`)
        : { updatedAt: -1 };
      const limit: number | string = parseInt(`${req.query.limit}`) || 10;
      let page: number | string = parseInt(`${req.query.page}`) || 1;
      let setField = FilterQuery.getField(fields);
      let isFilter = FilterQuery.getFilter(filters, stateFilter);

      if (!isFilter.status) {
        return res
          .status(400)
          .json({ status: 400, msg: "Error, Filter Invalid " });
      }
      // End
      const getAll = await Db.aggregate([
        {
          $lookup: {
            from: "users",
            localField: "user",
            foreignField: "_id",
            as: "user",
          },
        },
        {
          $match: isFilter.data,
        },
      ]);
      const result = await Db.aggregate([
        {
          $skip: page * limit - limit,
        },
        {
          $lookup: {
            from: "users",
            localField: "user",
            foreignField: "_id",
            as: "user",
          },
        },
        {
          $unwind: "$user",
        },
        {
          $match: isFilter.data,
        },
        {
          $limit: limit,
        },
        {
          $project: setField,
        },
        {
          $sort: order_by,
        },
      ]);

      if (result.length > 0) {
        return res.status(200).json({
          status: 200,
          total: getAll.length,
          limit,
          nextPage: page + 1,
          hasMore: getAll.length > page * limit ? true : false,
          data: result,
          filters: stateFilter,
        });
      }
      return res.status(200).json({
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
    if (!req.body.user) {
      return res.status(400).json({ status: 400, msg: "user Required!" });
    }
    if (!req.body.document._id) {
      return res
        .status(400)
        .json({ status: 400, msg: "document id Required!" });
    }
    if (!req.body.document.type) {
      return res
        .status(400)
        .json({ status: 400, msg: "document type Required!" });
    }
    if (!req.body.message) {
      return res.status(400).json({ status: 400, msg: "message Required!" });
    }

    const doctype = [
      "schedule",
      "scheduleitem",
      "schedulepacking",
      "roleuser",
      "roleprofile",
      "rolelist",
    ];

    const cekDocType = doctype.find((item) => item == req.body.document.type);
    if (!cekDocType) {
      return res
        .status(400)
        .json({ status: 400, msg: "Document type not found!" });
    }

    try {
      const result = new Db(req.body);
      const response = await result.save();
      return res.status(200).json({ status: 200, data: response });
    } catch (error) {
      return res
        .status(400)
        .json({ status: 400, msg: error ?? "Error Connection!" });
    }
  };

  show = async (req: Request, res: Response): Promise<Response> => {
    try {
      const cache = await Redis.client.get(`${redisName}-${req.params.id}`);
      if (cache) {
        console.log("Cache");
        return res.status(200).json({ status: 200, data: JSON.parse(cache) });
      }
      const result = await Db.findOne({ _id: req.params.id }).populate(
        "user",
        "name"
      );
      await Redis.client.set(
        `${redisName}-${req.params.id}`,
        JSON.stringify(result)
      );
      return res.status(200).json({ status: 200, data: result });
    } catch (error) {
      return res.status(404).json({ status: 404, data: error });
    }
  };

  update = async (req: Request, res: Response): Promise<Response> => {
    try {
      const result = await Db.updateOne({ name: req.params.id }, req.body);
      const getData = await Db.findOne({ name: req.params.id });
      await Redis.client.set(
        `${redisName}-${req.params.id}`,
        JSON.stringify(getData)
      );
      return res.status(200).json({ status: 200, data: result });
    } catch (error: any) {
      return res.status(404).json({ status: 404, data: error });
    }
  };

  delete = async (req: Request, res: Response): Promise<Response> => {
    try {
      const getData: any = await Db.findOne({ _id: req.params.id });

      if (!getData) {
        return res.status(404).json({ status: 404, msg: "Not found!" });
      }

      const result = await Db.deleteOne({ _id: req.params.id });
      await Redis.client.del(`${redisName}-${req.params.id}`);
      return res.status(200).json({ status: 200, data: result });
    } catch (error) {
      return res.status(404).json({ status: 404, msg: error });
    }
  };

  pushHistory = async (data: pushHistoryI): Promise<responseHistoryI> => {
    if (!data.user) {
      return { status: false, msg: "Required user" };
    }
    if (!data.document._id) {
      return { status: false, msg: "Required document id" };
    }
    if (!data.document.name) {
      return { status: false, msg: "Required document name" };
    }
    if (!data.document.type) {
      return { status: false, msg: "Required document type" };
    }
    if (!data.document.type) {
      return { status: false, msg: "Required Message" };
    }

    const doctype = [
      "user",
      "schedule",
      "scheduleitem",
      "schedulepacking",
      "roleuser",
      "roleprofile",
      "rolelist",
    ];

    const cekDocType = doctype.find((item) => item == data.document.type);

    if (!cekDocType) {
      return { status: false, msg: "Document not found!" };
    }

    try {
      const result = new Db(data);
      const response = await result.save();
      return { status: true, msg: response };
    } catch (error) {
      return { status: false, msg: error ?? "Error push history" };
    }
  };

  pushUpdateMany = async (
    prevData: any,
    nextData: any,
    user: any,
    userId: any,
    doc: String
  ): Promise<any> => {
    const props = Object.keys(prevData._doc);
    let differentProps = [];

    for (const i of props) {
      if (
        i !== "_id" &&
        i !== "createdAt" &&
        i !== "updatedAt" &&
        i !== "__v"
      ) {
        if (`${prevData[i]}` !== `${nextData[i]}`) {
          differentProps.push(i);
        }
      }
    }
    if (differentProps.length > 0) {
      for (const item of differentProps) {
        await this.pushHistory({
          document: {
            _id: prevData._id,
            name: prevData.name,
            type: `${doc}`,
          },
          message: `merubah ${item} dari ${prevData[item]} menjadi ${nextData[item]}`,
          user: userId,
        });
      }
    }
  };
}

export default new HistoryController();

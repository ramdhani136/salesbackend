import { Request, Response } from "express";
import axios from "axios";
import Redis from "../config/Redis";
import { IStateFilter } from "../Interfaces";
import Schedule from "../models/Schedule";
import { FilterQuery, PaddyData } from "../utils";
import IController from "./ControllerInterface";
import { History, ScheduleItem } from "../models";
import { TypeOfState } from "../Interfaces/FilterInterface";
import { HistoryController, WorkflowController } from "../controllers";
import { ISearch } from "../utils/FilterQuery";

const GetErpBin = async (warehouse: string): Promise<any> => {
  const uri = `${process.env.ERP_HOST}/api/resource/Bin?fields=[%22item_code%22,%22item_name%22,%22warehouse%22,%22actual_qty%22,%22stock_uom%22,%22modified%22,%22kategori_barang%22,%22stocker%22,%22name%22]&&filters=[[%22warehouse%22,%22=%22,%22${warehouse}%22],[%22disabled%22,%22=%22,%220%22]]&&limit=0`;
  const headers = {
    Authorization: `${process.env.ERP_TOKEN}`,
  };
  try {
    const result = await axios.get(uri, { headers });
    return { data: result.data, status: true };
  } catch (error) {
    return { data: [], status: false, msg: error };
  }
};

class ScheduleController implements IController {
  index = async (req: Request | any, res: Response): Promise<Response> => {
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
        name: "allow.barcode",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
      },
      {
        name: "allow.manual",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
      },
      {
        name: "warehouse",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
      },
      {
        name: "workflowState",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
      },
      {
        name: "bin",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
      },
      {
        name: "createdBy",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.Date,
      },
      {
        name: "status",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
      },
      {
        name: "startDate",
        operator: ["=", "!=", "like", "notlike", ">", "<", ">=", "<="],
        typeOf: TypeOfState.Date,
      },
      {
        name: "dueDate",
        operator: ["=", "!=", "like", "notlike", ">", "<", ">=", "<="],
        typeOf: TypeOfState.Date,
      },
      {
        name: "user.name",
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
        : [
            "name",
            "startDate",
            "dueDate",
            "workflowState",
            "warehouse",
            "createdBy",
            "status",
            "user.name",
            "updatedAt",
            "allow"
          ];
      const order_by: any = req.query.order_by
        ? JSON.parse(`${req.query.order_by}`)
        : { updatedAt: -1 };
      const limit: number | string = parseInt(`${req.query.limit}`) || 0;
      let page: number | string = parseInt(`${req.query.page}`) || 1;
      // let search: string = req.query.search || "";
      let search: ISearch = {
        filter: ["name", "workflowState", "warehouse"],
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
      const getAll = await Schedule.find(isFilter.data).count();
      const result = await Schedule.aggregate([
        {
          $sort: order_by,
        },
        {
          $match: isFilter.data,
        },
        {
          $skip: limit > 0 ? page * limit - limit : 0,
        },
        {
          $limit: limit > 0 ? limit : getAll,
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
          $project: setField,
        },
      ]);

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
      return res.status(200).json({
        status: 200,
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
    if (!req.body.startDate) {
      return res.status(400).json({ status: 400, msg: "StartDate Required!" });
    }
    if (!req.body.dueDate) {
      return res.status(400).json({ status: 400, msg: "DueDate Required!" });
    }
    if (!req.body.warehouse) {
      return res.status(400).json({ status: 400, msg: "Warehouse Required!" });
    }
    if (!req.body.workflowState) {
      return res
        .status(400)
        .json({ status: 400, msg: "WorkflowState Required!" });
    }
    req.body.user = req.userId;

    try {
      const prevData: any = await Schedule.findOne().sort({ createdAt: -1 });

      const date =
        new Date().getFullYear().toString() +
        PaddyData(new Date().getMonth() + 1, 2).toString();

      if (!prevData) {
        req.body.name = "SCH" + date + PaddyData(1, 3).toString();
      } else {
        let masterNumber = parseInt(
          prevData.name.substr(9, prevData.name.length)
        );
        req.body.name =
          "SCH" + date + PaddyData(masterNumber + 1, 3).toString();
      }

      const result = new Schedule(req.body);
      const response = await result.save();

      // push history
      await HistoryController.pushHistory({
        document: {
          _id: response._id,
          name: response.name,
          type: "schedule",
        },
        message: `membuat schedule baru`,
        user: req.userId,
      });
      // End

      await Redis.client.set(
        `schedule-${response._id}`,
        JSON.stringify(response),
        {
          EX: 30,
        }
      );

      const dataSchedule = {
        _id: response._id,
        name: response.name,
      };
      const warehouse: any = response.warehouse;
      const insertItem = await GetErpBin(warehouse);

      if (!insertItem.status) {
        return res.status(400).json({
          status: 400,
          data: insertItem.msg ?? "Error, Invalid Request",
        });
      }

      if (insertItem.data.data.length > 0) {
        const finalData = insertItem.data.data.map((data: any) => {
          data.schedule = dataSchedule;
          data.uniqId = `${response.name}${data.item_code}`;
          data.bin = data.name;
          return { ...data };
        });
        await ScheduleItem.insertMany(finalData);
      }
      return res.status(200).json({ status: 200, data: response });
    } catch (error) {
      return res.status(400).json({ status: 400, data: error });
    }
  };

  show = async (req: Request | any, res: Response): Promise<any> => {
    try {
      const cache = await Redis.client.get(`schedule-${req.params.id}`);
      if (cache) {
        const isCache = JSON.parse(cache);
        const getHistory = await History.find(
          {
            $and: [
              { "document._id": `${isCache._id}` },
              { "document.type": "schedule" },
            ],
          },

          ["_id", "message", "createdAt", "updatedAt"]
        )
          .populate("user", "name")
          .sort({ createdAt: -1 });
        const buttonActions = await WorkflowController.getButtonAction(
          "schedule",
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
      const result: any = await Schedule.findOne({
        name: req.params.id,
      }).populate("user", "name");

      const buttonActions = await WorkflowController.getButtonAction(
        "schedule",
        req.userId,
        result.workflowState
      );

      // return res.send(buttonActions)
      const getHistory = await History.find(
        {
          $and: [
            { "document._id": result._id },
            { "document.type": "schedule" },
          ],
        },
        ["_id", "message", "createdAt", "updatedAt"]
      )
        .populate("user", "name")
        .sort({ createdAt: -1 });

      await Redis.client.set(
        `schedule-${req.params.id}`,
        JSON.stringify(result),
        {
          EX: 30,
        }
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

  update = async (req: Request | any, res: Response): Promise<any> => {
    try {
      const result: any = await Schedule.findOne({
        name: req.params.id,
      }).populate("user", "name");

      if (result) {
        if (req.body.id_workflow && req.body.id_state) {
          const checkedWorkflow =
            await WorkflowController.permissionUpdateAction(
              req.body.id_workflow,
              req.userId,
              req.body.id_state,
              result.user._id
            );

          if (checkedWorkflow.status) {
            await Schedule.updateOne(
              { name: req.params.id },
              checkedWorkflow.data
            ).populate("user", "name");
          } else {
            return res
              .status(403)
              .json({ status: 403, msg: checkedWorkflow.msg });
          }
        } else {
          await Schedule.updateOne({ name: req.params.id }, req.body).populate(
            "user",
            "name"
          );
        }

        const getData: any = await Schedule.findOne({
          name: req.params.id,
        }).populate("user", "name");
        await Redis.client.set(
          `schedule-${req.params.id}`,
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
          "schedule"
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
      const result = await Schedule.findOneAndDelete({ name: req.params.id });
      if (result) {
        await Redis.client.del(`schedule-${req.params.id}`);
        // push history
        await HistoryController.pushHistory({
          document: {
            _id: result._id,
            name: result.name,
            type: "schedule",
          },
          message: `menghapus schedule nomor ${result.name}`,
          user: req.userId,
        });
        // End
        return res.status(200).json({ status: 200, data: result });
      }
      return res.status(404).json({ status: 404, msg: "Error Delete!" });
    } catch (error) {
      return res.status(404).json({ status: 404, msg: error });
    }
  };

  onRefreshItem = async (
    req: Request | any,
    res: Response
  ): Promise<Response> => {
    try {
      const schedule: any = await Schedule.findOne(
        {
          name: req.params.schedule,
        },
        ["name", "warehouse"]
      );
      const scheduleItem = await ScheduleItem.find(
        {
          "schedule.name": schedule.name,
        },
        ["item_code"]
      );

      const erpData = await GetErpBin(schedule.warehouse);

      let upData: any[] = [];

      for (const item of erpData.data.data) {
        const duplicate = scheduleItem.find(
          (i) => i.item_code == item.item_code
        );
        if (!duplicate) {
          item.schedule = {
            _id: schedule._id,
            name: schedule.name,
          };
          item.uniqId = `${schedule.name}${item.item_code}`;
          item.bin = item.name;
          upData = [...upData, item];
        }
      }

      if (upData.length > 0) {
        await ScheduleItem.insertMany(upData);
      }

      return res
        .status(200)
        .json({ status: 200, msg: "Success get data from erp!" });
    } catch (error) {
      return res
        .status(404)
        .json({ status: 404, msg: error ?? "Network Error" });
    }
  };
}

export default new ScheduleController();

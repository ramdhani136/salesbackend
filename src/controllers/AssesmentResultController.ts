import { Request, Response } from "express";
// import Redis from "../config/Redis";
import { IStateFilter } from "../Interfaces";
import { FilterQuery } from "../utils";
import IController from "./ControllerInterface";
import { AssesmentResult as Db, History, PermissionModel } from "../models";
import { TypeOfState } from "../Interfaces/FilterInterface";
import { AssesmentTemplateController, HistoryController, WorkflowController } from ".";
import { ISearch } from "../utils/FilterQuery";
import { PermissionMiddleware } from "../middleware";
import {
  selPermissionAllow,
  selPermissionType,
} from "../middleware/PermissionMiddleware";
import { ObjectId } from 'bson';


const redisName = "assesmentresult";

class AssesmentResultController implements IController {
  index = async (req: Request | any, res: Response): Promise<Response> => {
    const stateFilter: IStateFilter[] = [
      {
        alias: "CreatedBy",
        name: "createdBy._id",
        operator: ["=", "!="],
        typeOf: TypeOfState.String,
      },
      {
        alias: "Customer Id",
        name: "customer._id",
        operator: ["=", "!="],
        typeOf: TypeOfState.String,
      },
      {
        alias: "Customer Name",
        name: "customer.name",
        operator: ["like", "notlike"],
        typeOf: TypeOfState.String,
      },
      {
        alias: "Schedule Id",
        name: "schedule._id",
        operator: ["=", "!="],
        typeOf: TypeOfState.String,
      },
      {
        alias: "Schedule Name",
        name: "schedule.name",
        operator: ["like", "notlike"],
        typeOf: TypeOfState.String,
      },
      {
        alias: "Grade",
        name: "grade",
        operator: ["like", "notlike"],
        typeOf: TypeOfState.String,
      },
      {
        alias: "Notes",
        name: "notes",
        operator: ["like", "notlike"],
        typeOf: TypeOfState.String,
      },
      {
        alias: "ActiveDate",
        name: "activeDate",
        operator: ["=", "!=", ">", "<", ">=", "<="],
        typeOf: TypeOfState.Date,
      },
      {
        alias: "DeactiveDate",
        name: "deactiveDate",
        operator: ["=", "!=", ">", "<", ">=", "<="],
        typeOf: TypeOfState.Date,
      },
      {
        alias: "Score",
        name: "score",
        operator: ["=", "!=", ">", "<", ">=", "<="],
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
          "customer._id",
          "customer.name",
          "createdBy.name",
          "schedule.name",
          "schedule.name",
          "activeDate",
          "deactiveDate",
          "score",
          "grade",
          "notes",
          "details",
          "updatedAt",
        ];
      const order_by: any = req.query.order_by
        ? JSON.parse(`${req.query.order_by}`)
        : { updatedAt: -1 };
      const limit: number | string = parseInt(`${req.query.limit}`) || 0;
      let page: number | string = parseInt(`${req.query.page}`) || 1;
      let search: ISearch = {
        filter: ["name", "customer.name"],
        value: req.query.search || "",
      };

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

      // Menambahkan filter berdasarkan permission user
      if (userPermission.length > 0) {
        pipelineTotal.unshift({
          $match: {
            createdBy: { $in: userPermission.map((id) => new ObjectId(id)) },
          },
        });
      }
      // End
      // Menambahkan filter berdasarkan permission branch
      if (branchPermission.length > 0) {
        pipelineTotal.unshift({
          $match: {
            _id: { $in: branchPermission.map((id) => new ObjectId(id)) },
          },
        });
      }
      // End

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

      // Menambahkan filter berdasarkan permission user
      if (userPermission.length > 0) {
        pipelineResult.unshift({
          $match: {
            createdBy: { $in: userPermission.map((id) => new ObjectId(id)) },
          },
        });
      }
      // End
      // Menambahkan filter berdasarkan permission branch
      if (branchPermission.length > 0) {
        pipelineResult.unshift({
          $match: {
            _id: { $in: branchPermission.map((id) => new ObjectId(id)) },
          },
        });
      }
      // End

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
      if (!req.body.customer) {
        return res.status(400).json({ status: 400, msg: "Customer wajib diisi!" });
      }
      if (!req.body.customer._id) {
        return res.status(400).json({ status: 400, msg: "Id customer wajib diisi!" });
      }
      if (!req.body.customer.name) {
        return res.status(400).json({ status: 400, msg: "Nama schedule wajib diisi!" });
      }
      if (!req.body.schedule) {
        return res.status(400).json({ status: 400, msg: "Schedule wajib diisi!" });
      }
      if (!req.body.schedule._id) {
        return res.status(400).json({ status: 400, msg: "Id schedule wajib diisi!" });
      }
      if (!req.body.schedule.name) {
        return res.status(400).json({ status: 400, msg: "Nama schedule wajib diisi!" });
      }
      if (!req.body.activeDate) {
        return res.status(400).json({ status: 400, msg: "activeDate wajib diisi!" });
      }
      if (!req.body.deactiveDate) {
        return res.status(400).json({ status: 400, msg: "deactiveDate wajib diisi!" });
      }


      // Template
      if (!req.body.assesmentTemplate) {
        return res.status(400).json({ status: 400, msg: "assesmentTemplate wajib diisi!" });
      }

      if (typeof req.body.assesmentTemplate !== 'object') {
        return res.status(400).json({ status: 400, msg: "assesmentTemplate object!" });
      }

      if (req.body.assesmentTemplate.length === 0) {
        return res.status(400).json({ status: 400, msg: "assesmentTemplate wajib diisi!" });
      }
      if (!req.body.assesmentTemplate.indicators) {
        return res.status(400).json({ status: 400, msg: "assesmentTemplate indicators wajib diisi!" });
      }

      if (typeof req.body.assesmentTemplate.indicators !== 'object') {
        return res.status(400).json({ status: 400, msg: "Indicators array object!" });
      }

      if (req.body.assesmentTemplate.indicators.length === 0) {
        return res.status(400).json({ status: 400, msg: "Indicators wajib diisi!" });
      }


      // Cek indicators
      const indicatorOk: { valid: boolean, data?: string[], indicatorWeight?: number } = await AssesmentTemplateController.cekIndicator(req.body.assesmentTemplate.indicators);


      if (!indicatorOk.valid) {
        return res.status(400).json({ status: 400, msg: indicatorOk.data });
      }

      if (!req.body.assesmentTemplate.grades) {
        return res.status(400).json({ status: 400, msg: "assesmentTemplate grades wajib diisi!" });
      }

      if (typeof req.body.assesmentTemplate.grades !== 'object') {
        return res.status(400).json({ status: 400, msg: "Grades array object!" });
      }

      if (req.body.assesmentTemplate.grades.length === 0) {
        return res.status(400).json({ status: 400, msg: "Grades wajib diisi!" });
      }

      const gradeOk: { valid: boolean, data?: string[] } = await AssesmentTemplateController.cekGrade(req.body.assesmentTemplate.grades, indicatorOk.indicatorWeight!);

      if(!gradeOk.valid){
        return res.status(400).json({ status: 400, msg: gradeOk.data });
      }
      

      if (req.body.details.length !== req.body.assesmentTemplate.indicators.length) {
        return res.status(400).json({ status: 400, msg: "Semua pertanyaan wajib diisi!" });
      }

      // End
      // Proses result
      if (!req.body.details) {
        return res.status(400).json({ status: 400, msg: "Jawaban wajib diisi!" });
      }

      if (typeof req.body.details !== 'object') {
        return res.status(400).json({ status: 400, msg: "Jawaban array object!" });
      }

      if (req.body.details.length === 0) {
        return res.status(400).json({ status: 400, msg: "Jawaban wajib diisi!" });
      }
      // End   




      // Menghitung nilai
      const result = this.ProsesHitungNilai(req.body.details, req.body.assesmentTemplate.indicators, req.body.assesmentTemplate.grades);
      if (result.valid) {
        req.body.score = result.data?.totalScore
        req.body.details = result.data?.details
        req.body.grade = result.data?.nilai?.name
        req.body.notes = result.data?.nilai?.notes
      } else {
        return res.status(400).json({ status: 400, msg: result.error });
      }
      // End

      req.body.createdBy = {
        _id: req.userId,
        name: req.user
      }

      // const result = new Db(req.body);
      // const response = await result.save();

      return res.status(200).json({ status: 200, data: req.body });
    } catch (error) {
      return res.status(400).json({ status: 400, data: error });
    }
  };


  ProsesHitungNilai = (answers: any[], indicators: any[], grades: any[]): { valid: Boolean, data?: { details: any[], totalScore: number, nilai: any }, error?: any } => {
    try {
      let result: any[] = []
      let totalScore: number = 0;
      for (const answer of answers) {
        const score: number = this.getAnswerWeight(indicators, answer)
        answer.score = score
        totalScore += score;
        result.push(answer);
      }

      const nilai = grades.find(grade => totalScore >= grade.bottom && totalScore <= grade.top);

      return { valid: true, data: { details: result, totalScore: totalScore, nilai: nilai } }
    } catch (error) {
      return { valid: false, error: error }
    }
  }

  getAnswerWeight(indicators: any[], answerData: any) {
    const questionId = answerData.question._id
    const answer = answerData.answer

    const indicator = indicators.find(indicator => indicator.questionId === questionId);
    if (indicator) {
      const option = indicator.options.find((option: { name: any; }) => option.name === answer);
      const optionWeight = option ? option.weight : 0;
      return optionWeight !== 0 ? indicator.weight * (optionWeight / 100) : 0;
    }

    return 0;
  }

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

      const result = await Db.findOne({ $and: pipeline });

      if (!result) {
        return res
          .status(404)
          .json({ status: 404, msg: "Error, Data tidak ditemukan!" });
      }

      // Cek apakah digunakan di permission data
      const permission = await PermissionModel.findOne(
        {
          $and: [
            { allow: "branch" },
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
          msg: "Branch ini sudah digunakan oleh data permission!",
        });
      }
      // End

      // if (result.status === "1") {
      //   return res
      //     .status(404)
      //     .json({ status: 404, msg: "Error, status dokumen aktif!" });
      // }

      const actionDel = await Db.findOneAndDelete({ _id: req.params.id });
      // await Redis.client.del(`${redisName}-${req.params.id}`);
      // push history

      // End
      return res.status(200).json({ status: 200, data: actionDel });
    } catch (error) {
      return res.status(404).json({ status: 404, msg: error });
    }
  };
}

export default new AssesmentResultController();

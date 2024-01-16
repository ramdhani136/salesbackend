import { Request, Response } from "express";
import { IStateFilter } from "../Interfaces";
import { FilterQuery } from "../utils";
import IController from "./ControllerInterface";
import { AssesmentIndicator, AssesmentQuestion, AssesmentTemplate, } from "../models";
import { ISearch } from "../utils/FilterQuery";
import { TypeOfState } from "../Interfaces/FilterInterface";


const Db = AssesmentIndicator;

class AssesmentQuestionController implements IController {
  index = async (req: Request | any, res: Response): Promise<Response> => {
    const stateFilter: IStateFilter[] = [
      {
        alias: "Assesment Template",
        name: "assesmentTemplateId",
        operator: ["=", "!="],
        typeOf: TypeOfState.String,
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
          "assesmentTemplateId",
          "question.name",
          "weight",
          "desc",
          "options",
          "updatedAt",
          "createdAt",
        ];
      const order_by: any = req.query.order_by
        ? JSON.parse(`${req.query.order_by}`)
        : { updatedAt: -1 };
      const limit: number | string = parseInt(`${req.query.limit}`) || 0;
      let page: number | string = parseInt(`${req.query.page}`) || 1;
      let search: ISearch = {
        filter: [],
        value: req.query.search || "",
      };



      // Mengambil hasil fields
      let setField = FilterQuery.getField(fields);
      // End

      // Mengambil hasil filter
      let isFilter = FilterQuery.getFilter(filters, stateFilter, search, [
        "assesmentTemplateId"
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
            from: "assesmentquestions",
            localField: "questionId",
            foreignField: "_id",
            as: "question",
          },
        },
        {
          $unwind: "$question",
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
            from: "assesmentquestions",
            localField: "questionId",
            foreignField: "_id",
            as: "question",
          },
        },
        {
          $unwind: "$question",
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
      return res.status(404).json({
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
    if (!req.body.assesmentTemplateId) {
      return res.status(400).json({ status: 400, msg: "assesmentTemplateId wajib diisi!" });
    }

    const cekTemplate = await AssesmentTemplate.findById(req.body.assesmentTemplateId);
    if (!cekTemplate) {
      return res.status(400).json({ status: 400, msg: "Assesment template tidak ditemukan!" });
    }

    if (!req.body.questionId) {
      return res.status(400).json({ status: 400, msg: "questionId wajib diisi!" });
    }

    const cekQuestion = await AssesmentQuestion.findById(req.body.questionId);
    if (!cekQuestion) {
      return res.status(400).json({ status: 400, msg: "Question tidak ditemukan!" });
    }

    if (!req.body.weight) {
      return res.status(400).json({ status: 400, msg: "weight wajib diisi!" });
    }

    try {
      const result = new Db(req.body);
      const response = await result.save();




      return res.status(200).json({ status: 200, data: response });
    } catch (error) {
      return res.status(400).json({ status: 400, data: error });
    }
  };

  show = async (req: Request | any, res: Response): Promise<any> => {
    try {


      let pipeline: any = [{ _id: req.params.id }];



      const result: any = await Db.findOne({
        $and: pipeline,
      });

      if (!result) {
        return res
          .status(404)
          .json({ status: 404, msg: "Data tidak ditemukan!" });
      }



      return res.status(200).json({
        status: 200,
        data: result,
        // workflow: buttonActions,
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

      if (result) {

        if (req.body.assesmentTemplateId) {
          const cekTemplate = await AssesmentTemplate.findById(req.body.assesmentTemplateId);
          if (cekTemplate) {
            return res.status(400).json({ status: 400, msg: "Assesment template tidak ditemukan!" });
          }
        }

        if (req.body.questionId) {
          const cekQuestion = await AssesmentQuestion.findById(req.body.assesmentTemplateId);
          if (!cekQuestion) {
            return res.status(400).json({ status: 400, msg: "Question tidak ditemukan!" });
          }
        }

        await Db.updateOne({ _id: req.params.id }, req.body)
        const getData: any = await Db.findOne({
          _id: req.params.id,
        })
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
      const actionDel = await Db.findOneAndDelete({ _id: req.params.id });


      // End
      return res.status(200).json({ status: 200, data: actionDel });
    } catch (error) {
      return res.status(404).json({ status: 404, msg: error });
    }
  };
}

export default new AssesmentQuestionController();

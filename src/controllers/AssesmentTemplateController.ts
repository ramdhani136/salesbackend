import { Request, Response } from "express";
import { IStateFilter } from "../Interfaces";
import { FilterQuery } from "../utils";
import IController from "./ControllerInterface";
import { AssesmentQuestion, AssesmentSchedule, AssesmentTemplate, History, PermissionModel } from "../models";
import { TypeOfState } from "../Interfaces/FilterInterface";
import { HistoryController, WorkflowController } from ".";
import { ISearch } from "../utils/FilterQuery";
import { PermissionMiddleware } from "../middleware";
import {
  selPermissionAllow,
  selPermissionType,
} from "../middleware/PermissionMiddleware";
import { ObjectId } from 'bson';

const Db = AssesmentTemplate;
const redisName = "assesmenttemplate";


class AssesmentTemplateController implements IController {
  index = async (req: Request | any, res: Response): Promise<Response> => {
    const stateFilter: IStateFilter[] = [

      {
        alias: "Name",
        name: "name",
        operator: ["like", "notlike"],
        typeOf: TypeOfState.String,
        isSort: true,
      },
      {
        alias: "CreatedBy",
        name: "createdBy._id",
        operator: ["=", "!="],
        typeOf: TypeOfState.String,
      },
      {
        alias: "Status",
        name: "status",
        operator: ["=", "!=",],
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
          "workflowState",
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
      req.body.createdBy = req.userId;
      if (!req.body.name) {
        return res.status(400).json({ status: 400, msg: "Nama wajib diisi!" });
      }

      // Cek duplicate nama
      const dupName = await AssesmentTemplate.findOne({ name: req.body.name })

      if (dupName) {
        return res.status(400).json({ status: 400, msg: `Nama ${req.body.name} sudah digunakan sebelumnya!` });
      }

      // End

      if (!req.body.indicators) {
        return res.status(400).json({ status: 400, msg: "Indicators wajib diisi!" });
      }

      if (typeof req.body.indicators !== 'object') {
        return res.status(400).json({ status: 400, msg: "Indicators array object!" });
      }

      if (req.body.indicators.length === 0) {
        return res.status(400).json({ status: 400, msg: "Indicators wajib diisi!" });
      }

      const indicatorOk: { valid: boolean, data?: string[], indicatorWeight?: number } = await this.cekIndicator(req.body.indicators);

      if (indicatorOk.valid) {
        // Cek grade
        if (!req.body.grades) {
          return res.status(400).json({ status: 400, msg: "Grades wajib diisi!" });
        }

        if (typeof req.body.grades !== 'object') {
          return res.status(400).json({ status: 400, msg: "Grades array object!" });
        }

        if (req.body.grades.length === 0) {
          return res.status(400).json({ status: 400, msg: "Grades wajib diisi!" });
        }

        const gradeOk: { valid: boolean, data?: string[] } = await this.cekGrade(req.body.grades, indicatorOk.indicatorWeight!);
        // End

        if (gradeOk.valid) {
          const result = new Db(req.body);
          const response = await result.save();

          // push history
          await HistoryController.pushHistory({
            document: {
              _id: response._id,
              name: response.name,
              type: redisName,
            },
            message: `Membuat ${redisName} baru`,
            user: req.userId,
          });
          // End
          return res.status(200).json({ status: 200, data: response });
        } else {
          return res.status(400).json({ status: 400, msg: gradeOk.data });
        }



      } else {
        return res.status(400).json({ status: 400, msg: indicatorOk.data });
      }
    } catch (error) {
      return res.status(400).json({ status: 400, msg: error });
    }
  };

  cekGrade = async (grades: any[], indicatorWeight: number): Promise<{ valid: boolean; data?: string[]; }> => {
    let errors: string[] = [];
    const keysToCheck = ['bottom', 'top', "grade", "notes"];

    if (this.nilaiTopTertinggi(grades) < indicatorWeight) {
      errors.push(`Nilai maksimal top(${this.nilaiTopTertinggi(grades)}) grade tidak boleh kurang dari ${indicatorWeight}`)
    }

    if (errors.length === 0) {
      for (const grade of grades) {
        const index = grades.indexOf(grade) + 1;
        const missingKeys = keysToCheck.filter(key => !Object.keys(grade).includes(key));
        if (missingKeys.length > 0) {
          errors.push(`Data ${missingKeys} di grade no ${index} wajib diisi!`)
        } else {
          // Cek apakah diisi semua
          Object.keys(grade).map((item) => {
            if (grade[item] === "" || grade[item] === null) {
              errors.push(`Data ${item} di grade no ${index} wajib diisi!`)
            }
          })
          // End
        }

        if (errors.length === 0) {
          // Cek apakah botom harus dibawah top
          if (grade.bottom > grade.top) {
            errors.push(`Nilai bottom di grade ${index} tidak boleh melebihi nilai topnya!`)
          }
          // End
        }

      }
    }



    if (errors.length === 0) {


      // Cek apakah range saling menumpuk
      const overlap: { valid: boolean, errors?: string[] } = this.checkOverlap(grades);
      if (overlap.valid) {
        errors = [...errors, ...overlap.errors!];
      }
      // End

      // Cek kekosongan angka
      if (errors.length === 0) {
        const cekRangeKosong = this.cariKekosonganRentang(grades);
        if (cekRangeKosong.valid) {


          for (const range of cekRangeKosong.data!) {
            errors.push(`Terdapat kekosongan range ${range.bottom} - ${range.top} pada grades!`)
          }
        }
      }

      // End
    }


    // End

    if (errors.length > 0) {
      return { valid: false, data: errors };
    } else {
      return { valid: true };
    }
  }

  nilaiTopTertinggi(data: any[]): number {
    // Mengurutkan data berdasarkan nilai top secara descending
    const sortedData = data.sort((a, b) => b.top - a.top);

    // Mengambil nilai top tertinggi
    const topTertinggi = sortedData[0].top;

    return topTertinggi;
  }

  checkOverlap(data: any[]): { valid: boolean, errors?: string[] } {
    let errors: string[] = []
    for (let i = 0; i < data.length - 1; i++) {
      for (let j = i + 1; j < data.length; j++) {
        if (
          (data[i].bottom >= data[j].bottom && data[i].bottom <= data[j].top) ||
          (data[i].top >= data[j].bottom && data[i].top <= data[j].top)
        ) {
          errors.push(`Overlap range antara grade ${data[i].name} and ${data[j].name}`)
        }
      }
    }

    if (errors.length > 0) {
      return { valid: true, errors: errors }; // Jika terdapat tumpang tindih, hentikan pengecekan
    }
    return { valid: false }; // Jika tidak ada tumpang tindih
  }



  cariKekosonganRentang(data: any[]): { valid: boolean, data?: any[] } {
    // Menyimpan angka-angka yang mewakili kekosongan rentang
    let angkaKekosongan: any[] = [];

    // Mengurutkan data berdasarkan bottom
    data.sort((a, b) => a.bottom - b.bottom);

    // Menambahkan rentang awal jika rentang pertama tidak dimulai dari 0
    if (data.length === 0 || data[0].bottom > 0) {
      const rentangAwal = { bottom: 0, top: data.length > 0 ? Math.min(data[0].bottom - 1, Number.MAX_SAFE_INTEGER) : Number.MAX_SAFE_INTEGER };
      angkaKekosongan.push(rentangAwal);
    }

    // Memeriksa kekosongan atau tumpang tindih
    for (let i = 0; i < data.length - 1; i++) {
      if (data[i].top >= data[i + 1].bottom) {
        // Tidak ada kekosongan atau tumpang tindih
      } else {
        if (data[i].top + 1 <= data[i + 1].bottom - 1) {
          // Ada kekosongan atau tumpang tindih, menyimpan angka yang mewakili kekosongan
          angkaKekosongan.push({ bottom: data[i].top + 1, top: data[i + 1].bottom - 1 });
        }
      }
    }

    if (angkaKekosongan.length > 0) {
      return { valid: true, data: angkaKekosongan }
    } else {
      return { valid: false }
    }
  }






  cekIndicator = async (indicators: any[]): Promise<{ valid: boolean; data?: string[], indicatorWeight?: number; }> => {
    let errors: string[] = [];
    const keysToCheck = ['questionId', 'weight', 'options'];
    let indicatorWeight: number = 0;
    for (const indicator of indicators) {
      // let totalOptionWeight = 0;
      const index = indicators.indexOf(indicator) + 1;
      const missingKeys = keysToCheck.filter(key => !Object.keys(indicator).includes(key));
      if (missingKeys.length > 0) {
        errors.push(`Data ${missingKeys} di indicator no ${index} wajib diisi!`)
      } else {
        // cek apakah diisi datanya
        Object.keys(indicator).map((item, index) => {
          if (indicator[item] === "" || indicator[item] === null) {
            errors.push(`Data ${item} di indicator no ${index} wajib diisi!`)
          }
        })


        if (errors.length === 0) {
          // hitung weight total
          indicatorWeight += parseFloat(indicator.weight);
          // End

          // cek question
          try {
            const cekQuestion = await AssesmentQuestion.findById(indicator.questionId);
            if (!cekQuestion) {
              errors.push(`Question di indicator no ${index} tidak ditemukan!`)
            } else {
              // Cek options
              if (typeof indicator.options !== "object") {
                errors.push(`Question options di indicator no ${index} bukan object data!`)
              } else {
                if (indicator.options.length === 0) {
                  errors.push(`Cek kembali question di indikator no ${index}!`)
                } else {
                  const optionToCheck = ['name', 'weight'];
                  for (const option of indicator.options) {
                    const idOption = indicator.options.indexOf(option) + 1;
                    const missingOption = optionToCheck.filter(key => !Object.keys(option).includes(key));
                    if (missingOption.length > 0) {
                      errors.push(`Data ${missingOption} di option ${idOption} indicator no ${index} wajib diisi!`)
                    } else {
                      // Cek apakah data diisi semua
                      optionToCheck.map((op) => {
                        if (option[op] === "" || option[op] === null) {
                          errors.push(`Data ${op} di option no ${idOption} pada indicator no ${index} wajib diisi!`)
                        }
                      })
                      // End
                    }

                    if (errors.length === 0) {
                      // totalOptionWeight += option.weight;
                    }
                  }
                }
              }

              // End
            }
          } catch (error) {
            errors.push(`question ${index} tidak valid!`)
          }

        }
      }
      // if (errors.length === 0) {
      //   if (totalOptionWeight < 100 || totalOptionWeight > 100) {
      //     errors.push(`Total weight (${totalOptionWeight}%) pada option indicator nomor ${index} tidak boleh lebih atau kurang dari 100%!`)
      //   }
      // }
    }


    if (errors.length === 0) {
      // Cek indikator
      const dupIndicator: any[] = this.findDuplicateQuestionIds(indicators);
      if (dupIndicator.length > 0) {
        for (const dup of dupIndicator) {
          errors.push(`Duplikasi question di nomor ${dup.existingIndex} dengan nomor ${dup.currentIndex}!`)
        }
      }
      // End
    }
    if (errors.length > 0) {
      return { valid: false, data: errors };
    } else {
      return { valid: true, indicatorWeight: indicatorWeight };
    }

  }

  findDuplicateQuestionIds(indicators: any[]) {
    const seenIds = new Map(); // Menggunakan Map untuk menyimpan data dengan questionId yang sama
    const duplicates: any = [];

    indicators.forEach((indicator, index) => {
      if (seenIds.has(indicator.questionId)) {
        const existingIndex = seenIds.get(indicator.questionId) + 1;
        duplicates.push({ existingIndex, currentIndex: index + 1, questionId: indicator.questionId });
      } else {
        seenIds.set(indicator.questionId, index);
      }
    });

    return duplicates;
  }



  findDuplicateGrade(grades: any[]) {
    const seenIds = new Map(); // Menggunakan Map untuk menyimpan data dengan questionId yang sama
    const duplicates: any = [];

    grades.forEach((grade, index) => {
      if (seenIds.has(grade.name)) {
        const existingIndex = seenIds.get(grade.name) + 1;
        duplicates.push({ existingIndex, currentIndex: index + 1, name: grade.name });
      } else {
        seenIds.set(grade.name, index);
      }
    });

    return duplicates;
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


      let pipeline: any = [{ _id: req.params.id }];

      if (userPermission.length > 0) {
        pipeline.push({ createdBy: { $in: userPermission } });
      }

      if (branchPermission.length > 0) {
        pipeline.push({ _id: { $in: branchPermission } });
      }

      const result: any = await Db.findOne({
        $and: pipeline,
      }).populate("createdBy", "name").populate("indicators.questionId", "name");

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
      }).populate("createdBy", "name").populate("indicators.questionId", "name").lean()

      if (result) {

        if (req.body.name) {
          const duplicate = await Db.findOne({
            $and: [
              {
                name: req.body.name,
              },
              {
                _id: { $ne: req.params.id },
              },
            ],
          }, ["_id"]).count();

          if (duplicate > 0) {
            return res.status(200).json({ status: 200, data: `Nama ${req.body.name} sudah digunakan sebelumya!` });
          }
        }

        if (req.body.indicators) {
          if (typeof req.body.indicators !== 'object') {
            return res.status(400).json({ status: 400, msg: "Indicators array object!" });
          }

          if (req.body.indicators.length === 0) {
            return res.status(400).json({ status: 400, msg: "Indicators wajib diisi!" });
          }
        }

        const indicatorOk: { valid: boolean, data?: string[], indicatorWeight?: number } = await this.cekIndicator(req.body.indicators ?? result.indicators);
        if (indicatorOk.valid) {
          // Cek grade

          if (req.body.grades) {
            if (!req.body.grades) {
              return res.status(400).json({ status: 400, msg: "Grades wajib diisi!" });
            }

            if (typeof req.body.grades !== 'object') {
              return res.status(400).json({ status: 400, msg: "Grades array object!" });
            }

            if (req.body.grades.length === 0) {
              return res.status(400).json({ status: 400, msg: "Grades wajib diisi!" });
            }
          }
          const gradeOk: { valid: boolean, data?: string[] } = await this.cekGrade(req.body.grades ?? result.grades, indicatorOk.indicatorWeight!);
          if (gradeOk.valid) {
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

            // // push history semua field yang di update
            // await HistoryController.pushUpdateMany(
            //   result,
            //   getData,
            //   req.user,
            //   req.userId,
            //   redisName

            // );

            return res.status(200).json({ status: 200, data: getData });
            // End
          } else {
            return res
              .status(400)
              .json({ status: 400, msg: gradeOk.data });
          }

        } else {
          return res
            .status(400)
            .json({ status: 400, msg: indicatorOk.data });
        }
      } else {
        return res
          .status(404)
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

      const cekScheduleRelasi = await AssesmentSchedule.findOne({ assesmentTemplate: new ObjectId(req.params.id) }, ["name"])
      if (cekScheduleRelasi) {
        return res
          .status(404)
          .json({ status: 404, msg: `Gagal, Data terelasi dengan schedule (${cekScheduleRelasi.name})!` });
      }

      const actionDel = await Db.findOneAndDelete({ _id: req.params.id });
      // await Redis.client.del(`${redisName}-${req.params.id}`);
      // push history
      await HistoryController.pushHistory({
        document: {
          _id: result._id,
          name: result.name,
          type: redisName,
        },
        message: `Menghapus ${redisName} nomor ${result.name}`,
        user: req.userId,
      });
      // End
      return res.status(200).json({ status: 200, data: actionDel });
    } catch (error) {
      return res.status(404).json({ status: 404, msg: error });
    }
  };
}

export default new AssesmentTemplateController();

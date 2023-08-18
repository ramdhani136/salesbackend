import { Response } from "express";
import UserModel from "../models/UserModel";
import { CallsheetModel, visitModel } from "../models";

class ReportController {
  countPerUser = async (
    req: Request | any,
    res: Response
  ): Promise<Response> => {
   try {
    const result = await UserModel.aggregate([
        {
          $lookup: {
            from: "visits", // Nama koleksi catatan
            localField: "_id",
            foreignField: "createdBy",
            as: "visit",
            pipeline: [
              {
                $project: {
                  _id: 1,
                },
              },
            ],
          },
        },
        {
          $lookup: {
            from: "callsheets", // Nama koleksi catatan
            localField: "_id",
            foreignField: "createdBy",
            as: "callsheet",
            pipeline: [
              {
                $project: {
                  _id: 1,
                },
              },
            ],
          },
        },
        {
          $project: {
            name: 1,
            visit: { $size: "$visit" },
            callsheet: { $size: "$callsheet" },
          },
        },
      ]);
  
      return res.status(200).send(result);
   } catch (error:any) {
    return res.status(400).json({
        status: 400,
        msg: error,
      });
   }
  };

  counterDoc = async (req: Request | any, res: Response): Promise<Response> => {
    try {
      const visit: any = await visitModel.aggregate([
        {
          $count: "total",
        },
      ]);
      const callsheet: any = await CallsheetModel.aggregate([
        {
          $count: "total",
        },
      ]);

      return res.status(200).json({
        visit: visit[0].total,
        callsheet: callsheet[0].total,
      });
    } catch (error: any) {
      return res.status(400).json({
        status: 400,
        msg: error,
      });
    }
  };
}

export default new ReportController();

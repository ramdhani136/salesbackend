import { Response } from "express";
import UserModel from "../models/UserModel";
import { CallsheetModel, User, visitModel } from "../models";
import axios from "axios";

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
            img:1,
            visit: { $size: "$visit" },
            callsheet: { $size: "$callsheet" },
          },
        },
      ]);

      return res.status(200).send(result);
    } catch (error: any) {
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

  erpReport = async (req: Request | any, res: Response): Promise<Response> => {
    try {
      const cekUsers = await User.findById(req.userId);

      if (!cekUsers) {
        return res.status(400).json({
          status: 404,
          msg: "User tidak terdaftar!",
        });
      }

      if (!cekUsers.ErpSite) {
        return res.status(400).json({
          status: 404,
          msg: "Gagal, akun anda tidak terkoneksi dengan ERP",
        });
      }

      if (!cekUsers.ErpToken) {
        return res.status(400).json({
          status: 404,
          msg: "Gagal, akun anda tidak terkoneksi dengan ERP",
        });
      }

      const ErpSite = cekUsers.ErpSite;
      const ErpToken = cekUsers.ErpToken;

      const filters: any = req.query.filters
        ? JSON.parse(`${req.query.filters}`)
        : {};

      const uri = `https://${ErpSite}/api/method/frappe.desk.query_report.run?report_name=${
        req.params.doc
      }&filters=${JSON.stringify(filters)}&ignore_prepared_report=True`;

      const headers = {
        Authorization: `token ${ErpToken}`,
      };

      const result = await axios.get(uri, { headers });

      return res.status(200).json({ status: 200, data: result.data.message });
    } catch (error) {
      return res.status(400).json({
        status: 400,
        msg: `${error}`,
      });
    }
  };
}

export default new ReportController();

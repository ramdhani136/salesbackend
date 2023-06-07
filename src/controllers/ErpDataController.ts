import { Request, Response } from "express";
// import Redis from "../config/Redis";
import axios from "axios";
import { User } from "../models";

// const redisName = "packingid";

class ErpDataController {
  index = async (req: Request | any, res: Response): Promise<any> => {
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

      let filters: any = req.query.filters
        ? JSON.parse(`${req.query.filters}`)
        : [];

      if (filters.length > 0) {
        filters = filters.map((item: any) => {
          if (item[1] === "like") {
            item[2] = `%_${item[2]}%`;
          }
          return item;
        });
      }

      if (req.query.search) {
        filters = [...filters, ["name", "like", `%_${req.query.search}%`]];
      }

      const fields: any = req.query.fields
        ? JSON.parse(`${req.query.fields}`)
        : [];
      const order_by: any = req.query.order_by
        ? JSON.parse(`${req.query.order_by}`)
        : { modified: -1 };

      const limit: number | string = parseInt(`${req.query.limit}`) || 10;
      let page: number | string = parseInt(`${req.query.page}`) || 1;
      const uri = `https://${ErpSite}/api/resource/${req.params.doc}?${
        filters.length > 0 ? `filters=${JSON.stringify(filters)}&&` : ``
      }limit_start=${
        page == 1 ? 0 : page * limit
      }&limit_page_length=${limit}&&fields=${JSON.stringify(
        fields
      )}&&order_by=${Object.keys(order_by)[0]}%20${
        order_by[Object.keys(order_by)[0]] == -1 ? "desc" : "asc"
      }`;

      const headers = {
        Authorization: `token ${ErpToken}`,
      };

      const result = await axios.get(uri, { headers });

      if (result.data.data.length > 0) {
        return res.status(200).json({
          status: 200,
          limit,
          nextPage: page + 1,
          hasMore: true,
          data: result.data.data,
        });
      }
      return res.status(400).json({
        status: 400,
        msg: "Data not found!",
        hasMore: false,
      });
    } catch (error: any) {
      return res.status(400).json({
        status: 400,
        msg: `${error}`,
      });
    }
  };

  show = async (req: Request | any, res: Response): Promise<Response> => {
    try {
      //   const cache = await Redis.client.get(`${redisName}-${req.params.id}`);
      //   if (cache) {
      //     console.log("Cache");
      //     return res.status(200).json({ status: 200, data: JSON.parse(cache) });
      //   }

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
      const uri = `https:///${ErpSite}/api/resource/${req.params.doc}/${req.params.id}`;
      const headers = {
        Authorization: `token ${ErpToken}`,
      };
      const result = await axios.get(uri, { headers });
      const data = result.data.data;

      //   await Redis.client.set(
      //     `${redisName}-${req.params.id}`,
      //     JSON.stringify(data),
      //     {
      //       EX: 5,
      //     }
      //   );
      return res.status(200).json({ status: 200, data: data });
    } catch (error) {
      return res.status(404).json({ status: 404, data: error });
    }
  };
}

export default new ErpDataController();

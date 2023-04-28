import { Request, Response } from "express";
import Redis from "../config/Redis";
import { IStateFilter } from "../Interfaces";
import { TypeOfState } from "../Interfaces/FilterInterface";
import axios from "axios";

const redisName = "packingid";

class PackingIdController {
  index = async (req: Request, res: Response): Promise<any> => {
    const stateFilter: IStateFilter[] = [
      {
        name: "owner",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
      },
      {
        name: "id_packing",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
      },
      {
        name: "is_in",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
      },
      {
        name: "is_out",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
      },
      {
        name: "docstatus",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
      },
      {
        name: "item",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
      },
      {
        name: "item_name",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
      },
      {
        name: "KG",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
      },
      {
        name: "modified",
        operator: ["=", "!=", "like", "notlike", ">", "<", ">=", "<="],
        typeOf: TypeOfState.Date,
      },
      {
        name: "creation",
        operator: ["=", "!=", "like", "notlike", ">", "<", ">=", "<="],
        typeOf: TypeOfState.Date,
      },
    ];
    try {
      let filters: any = req.query.filters
        ? JSON.parse(`${req.query.filters}`)
        : [];

      if (req.query.search) {
        filters = [...filters, ["id_packing", "like", `%_${req.query.search}%`]];
      }
      const fields: any = req.query.fields
        ? JSON.parse(`${req.query.fields}`)
        : [
            "item_name",
            "qr_code",
            "item",
            "conversion",
            "stock_uom",
            "id_packing",
          ];
      const order_by: any = req.query.order_by
        ? JSON.parse(`${req.query.order_by}`)
        : { modified: -1 };

      const limit: number | string = parseInt(`${req.query.limit}`) || 10;
      let page: number | string = parseInt(`${req.query.page}`) || 1;
      const uri = `${
        process.env.ERP_HOST
      }/api/resource/Registration%20Packing%20ID?limit_start=${
        page == 1 ? 0 : page * limit
      }&limit_page_length=${limit}&&fields=${JSON.stringify(fields)}${
        filters.length > 0 ? `&&filters=${JSON.stringify(filters)}` : ``
      }&&order_by=${Object.keys(order_by)[0]}%20${
        order_by[Object.keys(order_by)[0]] == -1 ? "desc" : "asc"
      }`;
      const headers = {
        Authorization: `${process.env.ERP_TOKEN}`,
      };
      console.log(uri);
      const result = await axios.get(uri, { headers });

      if (result.data.data.length > 0) {
        return res.status(200).json({
          status: 200,
          limit,
          nextPage: page + 1,
          hasMore: true,
          data: result.data.data,
          filters: stateFilter,
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

  show = async (req: Request, res: Response): Promise<Response> => {
    try {
      const cache = await Redis.client.get(`${redisName}-${req.params.id}`);
      if (cache) {
        console.log("Cache");
        return res.status(200).json({ status: 200, data: JSON.parse(cache) });
      }
      const uri = `${process.env.ERP_HOST}/api/resource/Registration%20Packing%20ID/${req.params.id}`;
      const headers = {
        Authorization: `${process.env.ERP_TOKEN}`,
      };
      const result = await axios.get(uri, { headers });
      const data = result.data.data;

      await Redis.client.set(
        `${redisName}-${req.params.id}`,
        JSON.stringify(data),
        {
          EX: 5,
        }
      );
      return res.status(200).json({ status: 200, data: data });
    } catch (error) {
      return res.status(404).json({ status: 404, data: error });
    }
  };
}

export default new PackingIdController();

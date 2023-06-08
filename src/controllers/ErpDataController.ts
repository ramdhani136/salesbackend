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
      const headers = {
        Authorization: `token ${ErpToken}`,
      };
      const uri = `https://${ErpSite}/api/resource/${req.params.doc}/${req.params.id}`;
      const result = await axios.get(uri, { headers });
      const data = result.data.data;

      let isWorkflow: any[] = [];

      // Cek User Login
      const isUser = await axios.get(
        `https://${ErpSite}/api/method/frappe.auth.get_logged_user`,
        { headers }
      );

      if (!isUser) {
        return res
          .status(403)
          .json({ status: 403, msg: "User tidak terdaftar!" });
      }

      const getDataUser = await axios.get(
        `https://${ErpSite}/api/resource/User/${isUser.data.message}`,
        { headers }
      );

      if (!getDataUser) {
        if (!isUser) {
          return res
            .status(403)
            .json({ status: 403, msg: "User tidak terdaftar!" });
        }
      }

      let roles: any[] = getDataUser.data.data.roles.map(
        (item: any) => item.role
      );

      roles.push("All");

      const WorkflowActive = await axios.get(
        `https://${ErpSite}/api/resource/Workflow?filters=[["is_active","=","1"],["document_type","=","${req.params.doc}"]]`,
        { headers }
      );

      if (WorkflowActive.data.data.length > 0) {
        const workflowActive = WorkflowActive.data.data[0].name;

        const getWorkflow = await axios.get(
          `https://${ErpSite}/api/resource/Workflow/${workflowActive}`,
          { headers }
        );

        if (getWorkflow) {
          const transitions = getWorkflow.data.data.transitions;
          const state = getWorkflow.data.data.states;

          const filterWithWorkflowActive = transitions.filter((item: any) => {
            const allowSelf = item.allow_self_approval;
            let isOwner = false;
            if (allowSelf === 1) {
              if (data.owner === isUser.data.message) {
                isOwner = true;
              } else {
                isOwner = false;
              }
            } else {
              isOwner = false;
            }
            return item.state === data.workflow_state || isOwner;
          });

          if (filterWithWorkflowActive.length > 0) {
            const filteredData = filterWithWorkflowActive.filter((i: any) =>
              roles.includes(i.allowed)
            );

            if (filteredData.length > 0) {
              let uniqueActions = new Set();
              const uniqData = filteredData.filter((item: any) => {
                if (
                  !uniqueActions.has(item.action) &&
                  !uniqueActions.has(item.next_state)
                ) {
                  uniqueActions.add(item.action);
                  uniqueActions.add(item.next_state);
                  return true;
                }
                return false;
              });

              const finalNextState = uniqData.map((item: any) => {
                let getState = state.filter((i: any) => {
                  return i.state === item.next_state;
                });
                return {
                  action: item.action,
                  nextState: getState[0].state,
                  nextStatus: getState[0].doc_status,
                };
              });
              isWorkflow = finalNextState;
            }
          }
        }
      }

      // End

      //   await Redis.client.set(
      //     `${redisName}-${req.params.id}`,
      //     JSON.stringify(data),
      //     {
      //       EX: 5,
      //     }
      //   );
      return res
        .status(200)
        .json({ status: 200, data: data, workflow: isWorkflow });
    } catch (error: any) {
      return res.status(404).json({ status: 404, data: error.message });
    }
  };

  update = async (req: Request | any, res: Response): Promise<any> => {
    try {
      // if (!req.body.docstatus) {
      //   return res.status(400).json({
      //     status: 404,
      //     msg: "docstatus wajib diisi!",
      //   });
      // }

      // if (!req.body.workflow_state) {
      //   return res.status(400).json({
      //     status: 404,
      //     msg: "workflow_state wajib diisi!",
      //   });
      // }

      // Cek Dokumen
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
      const headers = {
        Authorization: `token ${ErpToken}`,
      };
      const uri = `https://${ErpSite}/api/resource/${req.params.doc}/${req.params.id}`;
      const result = await axios.get(uri, { headers });
      const data = result.data.data;

      if (!data) {
        return res.status(400).json({
          status: 404,
          msg: "Gagal, data tidak ditemukan!",
        });
      }
      // End

      const update = await axios.put(uri, req.body, { headers });
      res.status(200).json({ status: true, data: update.data.data });
    } catch (error: any) {
      res.status(400).json({ status: false, msg: error.message });
    }
  };
}

export default new ErpDataController();

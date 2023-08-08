import { Request, Response } from "express";
// import Redis from "../config/Redis";
import { ConfigModel } from "../models";

class ConfigController {
  show = async (req: Request | any, res: Response): Promise<any> => {
    try {
      const data = await ConfigModel.findOne({})
        .populate("visit.tagsMandatory", "name")
        .populate("callsheet.tagsMandatory", "name")
        .populate("visit.topicMandatory", "name")
        .populate("callsheet.topicMandatory", "name");
      res.status(200).json({ status: true, data: data });
    } catch (error) {
      res.status(400).json({ status: true, msg: error });
    }
  };

  update = async (req: Request | any, res: Response): Promise<any> => {
    try {
      const update = await ConfigModel.findByIdAndUpdate(
        req.params.id,
        req.body
      );
      res.status(200).json({ status: true, data: update });
    } catch (error) {
      res.status(400).json({ status: true, msg: error });
    }
  };
}

export default new ConfigController();

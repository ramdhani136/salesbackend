import { NextFunction, Request, Response } from "express";
import { MemoModel } from "../models";

// Cek & close schedule yang sudah melebihi closing date
export const CheckExpireMemoMiddleware = async (
    req: Request | any,
    res: Response,
    next: NextFunction
  ): Promise<any> => {
    const today = new Date();
    const startOfToday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      0,
      0,
      0,
      0
    );
    const update = { $set: { status: "3", workflowState: "Closed" } };
    try {
      await MemoModel.updateMany(
        {
          $and: [{ closingDate: { $lt: startOfToday } }, { status: "1" }],
        },
        update
      );
      next();
    } catch (error) {
      next();
    }
  };
  // End
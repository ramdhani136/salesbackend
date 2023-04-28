import { Request, Response } from "express";
import { IStateFilter } from "../Interfaces";
import { TypeOfState } from "../Interfaces/FilterInterface";
import { ChatModel, User } from "../models";
import MessageModel from "../models/MessageModel";
import FilterQuery, { ISearch } from "../utils/FilterQuery";

class MessageController {
  allMessages = async (req: Request | any, res: Response): Promise<any> => {
    const stateFilter: IStateFilter[] = [
      {
        name: "_id",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
      },
      {
        name: "sender",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
      },
      {
        name: "content",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
      },
      {
        name: "chat",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
      },
      {
        name: "chat._id",
        operator: ["=", "!=", "like", "notlike"],
        typeOf: TypeOfState.String,
      },
      {
        name: "updatedAt",
        operator: ["=", "!=", "like", "notlike", ">", "<", ">=", "<="],
        typeOf: TypeOfState.Date,
      },
      {
        name: "createdAt",
        operator: ["=", "!=", "like", "notlike", ">", "<", ">=", "<="],
        typeOf: TypeOfState.Date,
      },
    ];
    try {
      const fields: any = req.query.fields
        ? JSON.parse(`${req.query.fields}`)
        : ["sender", "content", "chat", "updatedAt", "createdAt"];
      const order_by: any = req.query.order_by
        ? JSON.parse(`${req.query.order_by}`)
        : { updatedAt: 1 };
      const limit: number | string = parseInt(`${req.query.limit}`) || 0;
      let page: number | string = parseInt(`${req.query.page}`) || 1;

      const search = req.query.search || "";

      let isFilter: any = { $and: [{ chat: req.params.chatId }] };

      if (search) {
        isFilter = {
          $and: [{ content: { $regex: search, $options: "i" } }],
        };
      }
      // Mengambil hasil fields
      let setField = FilterQuery.getField(fields);
      // End

      const getAll = await MessageModel.find(isFilter).count();
      const messages = await MessageModel.find(isFilter, setField)
        .sort(order_by)
        .skip(
          limit > 0
            ? getAll - page * limit < 0
              ? 0
              : getAll - page * limit
            : 0
        )
        .limit(limit > 0 ? limit : getAll)
        .populate("sender", "name pic email")
        .populate("chat", "users");

      return res.status(200).json({
        status: 200,
        total: getAll,
        limit,
        nextPage: getAll > page * limit && limit > 0 ? page + 1 : page,
        hasMore: getAll > page * limit && limit > 0 ? true : false,
        data: messages,
        filters: stateFilter,
      });
    } catch (error: any) {
      res.status(400);
      throw new Error(error.message);
    }
  };

  sendMessage = async (req: Request | any, res: Response): Promise<any> => {
    const { content, chatId } = req.body;

    if (!content) {
      return res.status(400).json({ status: 400, msg: "content Required!" });
    }

    if (!chatId) {
      return res.status(400).json({ status: 400, msg: "chatId Required!" });
    }

    var newMessage = {
      sender: req.userId,
      content: content,
      chat: chatId,
    };

    try {
      var message: any = await MessageModel.create(newMessage);
      message = await message.populate("sender", "name pic");
      message = await message.populate("chat", "users");
      message = await User.populate(message, {
        path: "chat.users",
        select: "name pic email",
      });

      await ChatModel.findByIdAndUpdate(req.body.chatId, {
        latestMessage: message,
      });

      return res.status(200).json({ status: 200, data: message });
    } catch (error: any) {
      res.status(400);
      throw new Error(error.message);
    }
  };
}

export default new MessageController();

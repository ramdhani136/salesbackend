import { Request, Response } from "express";
import { ChatModel, User } from "../models";

class ChatController {
  accessChat = async (req: Request | any, res: Response): Promise<any> => {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ status: 400, msg: "userId Required!" });
    }
    var isChat: any = await ChatModel.findOne({
      isGroupChat: false,
      $and: [
        { users: { $elemMatch: { $eq: req.userId } } },
        { users: { $elemMatch: { $eq: userId } } },
      ],
    })
      .populate("users", "-password")
      .populate("latestMessage");

    isChat = await User.populate(isChat, {
      path: "latestMessage.sender",
      select: "name username email",
    });

    if (isChat) {
      return res.status(200).json({ status: 200, data: isChat });
    } else {
      var chatData = {
        chatName: "sender",
        isGroupChat: false,
        users: [req.userId, userId],
      };

      try {
        const createdChat = await ChatModel.create(chatData);
        const FullChat = await ChatModel.findOne({
          _id: createdChat._id,
        }).populate("users", "-password");
        return res.status(200).json({ status: 200, data: FullChat });
      } catch (error: any) {
        return res.status(400).json({ status: 400, msg: error.message });
      }
    }
  };

  fetchChats = async (req: Request | any, res: Response): Promise<any> => {
    try {
      await ChatModel.find({
        users: { $elemMatch: { $eq: req.userId } },
      })
        .populate("users", "-password")
        .populate("groupAdmin", "-password")
        .populate("latestMessage")
        .sort({ updatedAt: -1 })
        .then(async (results: any) => {
          results = await User.populate(results, {
            path: "latestMessage.sender",
            select: "name username email",
          });
          return res.status(200).json({ status: 200, data: results });
        });
    } catch (error: any) {
      res.status(400);
      return res.status(400).json({ status: 400, msg: error.message });
    }
  };
}

export default new ChatController();

import express, { Application, Request, Response } from "express";
import bodyParser from "body-parser";
import morgan from "morgan";
import helmet from "helmet";
import { config as dotenv } from "dotenv";
import cors from "cors";
import compression from "compression";
import DataConnect from "./config/db";
import http from "http";
import path from "path";
import {
  ChatRoutes,
  HistoryRoutes,
  MessageRoutes,
  RoleListRoutes,
  RoleProfileRoutes,
  RoleUserRoutes,
  ScheduleRoutes,
  UserRoutes,
  workflowActionRoutes,
  WorkflowCangerRoutes,
  WorkflowRoutes,
  WorkflowStateRoutes,
  WorkflowTransitionRoutes,
  BranchRoutes,
  PermissionRoutes,
  CustomerGroupRoutes,
  CustomerRoutes,
  VisitRoutes,
  ContactRoutes,
  NamingSeriesRoutes,
  UserGroupRoutes,
  UserGroupListRoutes,
  ScheduleListRoutes,
  TagRoutes,
  VisitNoteRoutes,
  CallsheetRoutes,
  CallsheetNoteRoutes,
  MemoRoutes,
  ErpDataRoutes,
} from "./routes";
// import Redis from "./config/Redis";
import { SocketIO } from "./utils";
import cron from "node-cron";
import { AuthMiddleware, RoleMiddleware } from "./middleware";
import { MemoModel, ScheduleModel } from "./models";

const cookieParser = require("cookie-parser");

const corsOptions = {
  origin: ["*", "http://localhost:5173", "http://localhost"],
  credentials: true,
  optionSuccessStatus: 200,
};

class App {
  public app: Application;
  public server: any;
  public io: any;
  public database: DataConnect;

  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.plugins();
    this.database = new DataConnect();
    this.routes();
    // this.Cron();
  }

  protected plugins(): void {
    this.app.use(cookieParser());
    dotenv();
    this.app.use(bodyParser.json());
    this.app.use(compression());
    this.app.use(morgan("dev"));
    this.app.use(helmet());
    this.app.use(cors(corsOptions));
    // Redis.getConnect();
    this.getSocket();
    this.app.use(
      "/public",
      express.static(path.join(__dirname, "public/images"))
    );
    this.app.use(
      "/public",
      express.static(path.join(__dirname, "public/memo"))
    );
    this.app.use(
      "/images/users",
      express.static(path.join(__dirname, "public/users"))
    );
  }

  protected Cron(): void {
    cron.schedule("* * * * *", async function () {
      // Cek & close schedule yang sudah melebihi closing date
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

      // Check expired schedule
      const update = { $set: { status: "3", workflowState: "Closed" } };
      try {
        await ScheduleModel.updateMany(
          {
            $and: [{ closingDate: { $lt: startOfToday } }, { status: "1" }],
          },
          update
        );
      } catch (error) {
        throw error;
      }
      // End

      // Cek Expired Memo
      const updateMemo = { $set: { status: "3", workflowState: "Closed" } };
      try {
        await MemoModel.updateMany(
          {
            $and: [{ closingDate: { $lt: startOfToday } }, { status: "1" }],
          },
          updateMemo
        );
      } catch (error) {
        throw error;
      }
      // End
    });
  }

  protected getSocket(): void {
    this.io = new SocketIO(this.server).io;
    let users: any[] = [];
    this.io.on("connection", (socket: any) => {
      socket.on("setup", (userData: String) => {
        socket.join(userData);
        socket.emit("connected");
        console.log(`User ${userData} Connected`);
      });

      socket.on("join", (user: any) => {
        console.log(`${user} joined the chat`);
        users[socket.id] = { user };
        io.emit("activeUsers", Object.values(users));
      });

      socket.on("join chat", (room: String) => {
        socket.join(room);
        console.log("User Joined Room: " + room);
      });

      socket.on("typing", (room: String) => socket.in(room).emit("typing"));

      socket.on("stop typing", (room: String) =>
        socket.in(room).emit("stop typing")
      );

      socket.on("new message", (newMessageRecieved: any) => {
        var chat = newMessageRecieved.chat;

        if (!chat.users) return console.log("chat.users not defined");

        chat.users.forEach((user: any) => {
          if (user._id == newMessageRecieved.sender._id) return;
          socket.in(user._id).emit("message recieved", newMessageRecieved);
        });
      });

      socket.off("setup", (userData: String) => {
        console.log(` USER ${userData} DISCONNECTED`);
        socket.leave(userData);
      });

      socket.on("disconnect", () => {
        console.log("Disconnect");
        // Hapus pengguna dari daftar pengguna aktif
        delete users[socket.id];

        // Kirim daftar pengguna aktif yang telah diupdate ke pengguna lain
        io.emit("activeUsers", Object.values(users));
      });
    });
  }

  protected routes(): void {
    this.app.use("/users", UserRoutes);
    this.app.use("/erp", ErpDataRoutes);
    this.app.use("/branch", AuthMiddleware, BranchRoutes);
    this.app.use("/permission", AuthMiddleware, PermissionRoutes);
    this.app.use("/customer", AuthMiddleware, CustomerRoutes);
    this.app.use("/customergroup", AuthMiddleware, CustomerGroupRoutes);
    this.app.use("/visit", AuthMiddleware, VisitRoutes);
    this.app.use("/callsheet", AuthMiddleware, CallsheetRoutes);
    this.app.use("/contact", AuthMiddleware, ContactRoutes);
    this.app.use("/namingseries", AuthMiddleware, NamingSeriesRoutes);
    this.app.use("/usergroup", AuthMiddleware, UserGroupRoutes);
    this.app.use("/usergrouplist", AuthMiddleware, UserGroupListRoutes);
    this.app.use("/schedule", AuthMiddleware, ScheduleRoutes);
    this.app.use("/schedulelist", AuthMiddleware, ScheduleListRoutes);
    this.app.use(
      "/roleprofile",
      AuthMiddleware,
      // RoleValidation,
      RoleProfileRoutes
    );
    this.app.use("/rolelist", AuthMiddleware, RoleListRoutes);
    this.app.use("/roleuser", AuthMiddleware, RoleUserRoutes);
    this.app.use("/tag", AuthMiddleware, TagRoutes);
    this.app.use("/visitnote", AuthMiddleware, VisitNoteRoutes);
    this.app.use("/callsheetnote", AuthMiddleware, CallsheetNoteRoutes);
    this.app.use("/memo", AuthMiddleware, MemoRoutes);

    this.app.use("/workflowstate", AuthMiddleware, WorkflowStateRoutes);
    this.app.use("/workflowaction", AuthMiddleware, workflowActionRoutes);
    this.app.use("/workflow", AuthMiddleware, WorkflowRoutes);
    this.app.use(
      "/workflowtransition",
      AuthMiddleware,
      WorkflowTransitionRoutes
    );
    this.app.use("/workflowchanger", AuthMiddleware, WorkflowCangerRoutes);
    // this.app.use("/history", AuthMiddleware, HistoryRoutes);
    // this.app.use("/chat", AuthMiddleware, ChatRoutes);
    // this.app.use("/message", AuthMiddleware, MessageRoutes);
  }
}

const port: number = 5000;
const app = new App();
const send = app.database;
const io = app.io;

app.server.listen(port, () => {
  console.log(`Listening on port ${port}`);
});

export { io, send };

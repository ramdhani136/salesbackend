import express, { Application } from "express";
import bodyParser from "body-parser";
import morgan from "morgan";
import helmet from "helmet";
import { config as dotenv } from "dotenv";
import cors from "cors";
import compression from "compression";
import DataConnect from "./config/db";
import http from "http";
import path from "path";
import bcrypt from "bcrypt";
import { mkdirp } from "mkdirp";
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
  ConfigRoutes,
  TopicRoutes,
  FileRoutes,
  NotesRoutes,
  ReportRoutes,
  AssesmentTemplateRoutes,
  AssesmentQuestionRoutes,
  AssesmentScheduleRoutes,
  AssesmentScheduleListRoutes,
} from "./routes";
// import Redis from "./config/Redis";
import { SocketIO } from "./utils";
import cron from "node-cron";
import { AuthMiddleware, RoleMiddleware } from "./middleware";
import {
  ConfigModel,
  MemoModel,
  RoleListModel,
  RoleProfileModel,
  RoleUserModel,
  ScheduleModel,
  User,
  WorkflowState,
} from "./models";


const cookieParser = require("cookie-parser");

const corsOptions = {
  origin: [
    "*",
    "http://localhost:5173",
    "http://localhost:4173",
    "http://localhost:3000",
    "http://localhost",
  ],
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

  protected SettingDefaultData = async (): Promise<any> => {
    try {
      let userId = null;
      let roleProfileId = null;

      // Cek Config
      const getConfig = await ConfigModel.findOne();

      if (!getConfig) {
        await ConfigModel.create({});
      }

      // End

      // Cek User
      const user: any = await User.findOne(
        { username: "administrator" },
        { _id: 1 }
      );

      if (!user) {
        const salt = await bcrypt.genSalt();

        const insertUser = new User({
          name: "Administrator",
          password: await bcrypt.hash("!Etms000!", salt),
          username: "administrator",
          status: "1",
          workflowState: "Enabled",
        });

        const getUser: any = await insertUser.save({});

        userId = getUser._id;
      } else {
        userId = user._id;
      }

      // End Check User

      // Cek RoleProfile

      const doc = [
        "users",
        "branch",
        "permission",
        "customer",
        "customergroup",
        "visit",
        "callsheet",
        "contact",
        "namingseries",
        "usergroup",
        "usergrouplist",
        "schedule",
        "schedulelist",
        "roleprofile",
        "rolelist",
        "roleuser",
        "tag",
        "memo",
        "erp",
        "namingseries",
        "workflowstate",
        "workflowaction",
        "workflow",
        "workflowtransition",
        "workflowchanger",
      ];

      const roleProfile: any = await RoleProfileModel.findOne({
        name: "Administrator",
      });

      if (!roleProfile) {
        const insertRoleProfile = new RoleProfileModel(
          {
            name: "Administrator",
            status: "1",
            workflowState: "Submitted",
            createdBy: userId,
          },
          { _id: 1 }
        );
        const getRoleProfile: any = await insertRoleProfile.save({});
        roleProfileId = getRoleProfile._id;

        for (const item of doc) {
          await RoleListModel.create({
            roleprofile: roleProfileId,
            doc: item,
            create: 1,
            read: 1,
            update: 1,
            delete: 1,
            amend: 1,
            submit: 1,
            report: 1,
            export: 1,
            createdBy: userId,
          });
        }
      } else {
        roleProfileId = roleProfile._id;
        for (const item of doc) {
          let valid = await RoleListModel.findOne(
            {
              $and: [{ roleprofile: roleProfileId }, { doc: item }],
            },
            { _id: 1 }
          );

          if (!valid) {
            await RoleListModel.create({
              roleprofile: roleProfileId,
              doc: item,
              create: 1,
              read: 1,
              update: 1,
              delete: 1,
              amend: 1,
              submit: 1,
              report: 1,
              export: 1,
              createdBy: userId,
            });
          }
        }
      }

      // End Cek RoleProfile

      // Cek roleuser
      const roleuser = await RoleUserModel.findOne(
        {
          $and: [{ roleprofile: roleProfileId }, { user: userId }],
        },
        { _id: 1 }
      );

      if (!roleuser) {
        await RoleUserModel.create({
          roleprofile: roleProfileId,
          user: userId,
          createdBy: userId,
        });
      }
      // End

      // Cek WorkflowState
      const state = ["Draft", "Submitted"];

      for (const iState of state) {
        let getState = await WorkflowState.findOne(
          { name: iState },
          { _id: 1 }
        );
        if (!getState) {
          await WorkflowState.create({ name: iState, user: userId });
        }
      }
      // End
    } catch (error) {
      console.log(error);
    }
  };

  protected SetPath = (): void => {
    const imagePath = path.join(__dirname, "public/images");
    const memoPath = path.join(__dirname, "public/memo");
    const userPath = path.join(__dirname, "public/users");
    const assetPath = path.join(__dirname, "assets/images");
    const customerPath = path.join(__dirname, "public/customers");
    const fileAsset = path.join(__dirname, "public/files");

    const dir = [
      imagePath,
      memoPath,
      userPath,
      assetPath,
      customerPath,
      fileAsset,
    ];

    for (const item of dir) {
      mkdirp(item)
        .then((made) => console.log(`Membuat folder ${item}`))
        .catch((err) => {
          console.log(`Gagal membuat folder ${item} `);
        });
    }
    this.app.use("/public", express.static(imagePath));
    this.app.use("/public", express.static(path.join(memoPath)));
    this.app.use("/images/users", express.static(userPath));
    this.app.use("/public/customer", express.static(customerPath));
    this.app.use(`/public/files`, express.static(fileAsset));
  };

  protected plugins(): void {
    this.app.use(cookieParser());
    dotenv();
    this.app.use(bodyParser.json());
    this.app.use(compression());
    this.app.use(morgan("dev"));

    this.app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            scriptSrc: [
              "'self'",
              "www.google.com www.gstatic.com",
              "https://*.statcounter.com",
              "'unsafe-inline'",
            ],
            frameSrc: ["'self'", "www.google.com", "https://*.statcounter.com"],
            connectSrc: ["'self'", "https://*.statcounter.com"],
          },
        },

        crossOriginResourcePolicy: { policy: "cross-origin" },
        crossOriginEmbedderPolicy: false,
      })
    );
    this.app.use(cors(corsOptions));
    // Redis.getConnect();
    this.getSocket();
    this.SetPath();
    this.SettingDefaultData();
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
 
        // console.log(`User ${userData} Connected`);
      });

      socket.on("join", (user: any) => {
        // console.log(`${user} joined the chat`);
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
    this.app.use("/config", AuthMiddleware, RoleMiddleware, ConfigRoutes);
    this.app.use("/config", AuthMiddleware, RoleMiddleware, ConfigRoutes);
    this.app.use("/erp", AuthMiddleware, RoleMiddleware, ErpDataRoutes);
    this.app.use("/branch", AuthMiddleware, RoleMiddleware, BranchRoutes);
    this.app.use(
      "/permission",
      AuthMiddleware,
      RoleMiddleware,
      PermissionRoutes
    );
    this.app.use("/customer", AuthMiddleware, RoleMiddleware, CustomerRoutes);
    this.app.use("/topic", AuthMiddleware, RoleMiddleware, TopicRoutes);
    this.app.use(
      "/customergroup",
      AuthMiddleware,
      RoleMiddleware,
      CustomerGroupRoutes
    );
    this.app.use("/visit", AuthMiddleware, RoleMiddleware, VisitRoutes);
    this.app.use("/files", AuthMiddleware, FileRoutes);
    this.app.use("/callsheet", AuthMiddleware, RoleMiddleware, CallsheetRoutes);
    this.app.use("/contact", AuthMiddleware, RoleMiddleware, ContactRoutes);
    this.app.use(
      "/namingseries",
      AuthMiddleware,
      RoleMiddleware,
      NamingSeriesRoutes
    );
    this.app.use("/usergroup", AuthMiddleware, RoleMiddleware, UserGroupRoutes);
    this.app.use("/usergrouplist", AuthMiddleware, UserGroupListRoutes);
    this.app.use("/schedule", AuthMiddleware, RoleMiddleware, ScheduleRoutes);
    this.app.use("/schedulelist", AuthMiddleware, ScheduleListRoutes);
    this.app.use(
      "/roleprofile",
      AuthMiddleware,
      RoleMiddleware,
      RoleProfileRoutes
    );
    this.app.use("/rolelist", AuthMiddleware, RoleMiddleware, RoleListRoutes);
    this.app.use("/roleuser", AuthMiddleware, RoleMiddleware, RoleUserRoutes);
    this.app.use("/tag", AuthMiddleware, RoleMiddleware, TagRoutes);
    this.app.use("/notes", AuthMiddleware, NotesRoutes);
    // this.app.use("/visitnote", AuthMiddleware, VisitNoteRoutes);
    // this.app.use("/callsheetnote", AuthMiddleware, CallsheetNoteRoutes);
    this.app.use("/memo", AuthMiddleware, RoleMiddleware, MemoRoutes);
    this.app.use("/report", AuthMiddleware, ReportRoutes);

    this.app.use(
      "/workflowstate",
      AuthMiddleware,
      RoleMiddleware,
      WorkflowStateRoutes
    );
    this.app.use(
      "/workflowaction",
      AuthMiddleware,
      RoleMiddleware,
      workflowActionRoutes
    );
    this.app.use("/workflow", AuthMiddleware, RoleMiddleware, WorkflowRoutes);
    this.app.use(
      "/workflowtransition",
      AuthMiddleware,
      RoleMiddleware,
      WorkflowTransitionRoutes
    );
    this.app.use(
      "/workflowchanger",
      AuthMiddleware,
      RoleMiddleware,
      WorkflowCangerRoutes
    );
    this.app.use("/history", AuthMiddleware, HistoryRoutes);
    this.app.use("/assesmentquestion", AuthMiddleware, RoleMiddleware, AssesmentQuestionRoutes);
    this.app.use("/assesmenttemplate", AuthMiddleware, RoleMiddleware, AssesmentTemplateRoutes);
    this.app.use("/assesmentschedule", AuthMiddleware, RoleMiddleware, AssesmentScheduleRoutes);
    this.app.use("/assesmentschedulelist", AuthMiddleware, RoleMiddleware, AssesmentScheduleListRoutes);
    // this.app.use("/chat", AuthMiddleware, ChatRoutes);
    // this.app.use("/message", AuthMiddleware, MessageRoutes);
  }
}

const port: number = 5000;
const system = new App();
const send = system.database;
const io = system.io;



system.server.listen(port, () => {
  console.log(`Listening on port ${port}`);
});

export { io, send, system };

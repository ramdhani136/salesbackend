
import { Client } from "whatsapp-web.js";
import { system, io } from "..";
import { NextFunction, Request, Response } from "express";
import { WhatsAppClientRoutes } from "../routes";
import { AuthMiddleware } from "../middleware";
import { WhatsappClientModel } from "../models";


const {
  RemoteAuth,
} = require("whatsapp-web.js");
const qrcode = require("qrcode");

class WhatsAppBoot {
  private clients: Record<string, any> = {};
  private store: string;


  private async pushMessage(user: string) {

    try {
      const isClient: Client = this.clients[`${user}`];
      if (isClient) {
        const status = await isClient.getState()
        if (status === "CONNECTED") {
          io.to(user).emit("message", "Client is connected!");
          io.to(user).emit("qr", null);
        } else if (!status) {
          io.to(user).emit("message", "Loading ..");
          // if (isClient) {
          //   await isClient.destroy();
          //   isClient.initialize();
          // }
        } else { io.to(user).emit("message", status) }
      }
    } catch (error) {
      console.log(error)
    }


    // if (await client.getState() === "CONNECTED") {
    //   io.to(user).emit("message", "Client is connected!");
    //   io.to(user).emit("qr", null);
    // } else {
    //   io.to(user).emit("message", "Client is connected!");
    // }
  }

  InitialClient = (user: String) => {
    if (this.store) {
      try {
        const client: Client = new Client({
          authStrategy: new RemoteAuth({
            store: this.store,
            backupSyncIntervalMs: 300000,
            puppeteer: {
              headless: true,
              args: [
                "--no-sanbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-accelerated-2d-canvas",
                "--no-first-run",
                "--no-zygote",
                "--single-process",
                "--disable-gpu",
              ],
            },
            clientId: user,
          }),
        });


        client.initialize();

        client.on("qr", (qr: any) => {
          // qrcode.generate(qr, { small: true });
          try {
            qrcode.toDataURL(qr, (err: any, url: any) => {
              io.to(user).emit("qr", url);
              io.to(user).emit("message", "QR Code received,scan please .");
            });
          } catch (error) {
            console.log(error);
            io.to(user).emit("message", "QR Code Failded to Call! .");
          }
        });

        client.on("ready", () => {
          console.log(user + " Client is ready!");
          io.to(user).emit("message", "Client is connected!");
          io.to(user).emit("qr", null);
        });

        client.on("remote_session_saved", () => {
          console.log(user + " Session Saved");
          io.to(user).emit("message", "Session Saved!");
        });

        client.on("authenticated", (session: any) => {
          console.log(user + " authenticated");
          io.to(user).emit("message", "Whatsapp is authenticated!");
        });

        client.on("auth_failure", (session: any) => {
          io.to(user).emit("message", "Auth eror ,restarting...");
          console.log(user + " auth_failure");;
          client.initialize();
        });

        client.on("disconnected", (reason: any) => {
          io.to(user).emit("message", "Whatsapp is disconnected!");
          console.log(user + " disconnected");
          client.initialize();
        });


        client.on("loading_screen", (percent: any, message: any) => {
          try {
            io.to(user).emit("message", "Loading ..");
            console.log(user + " LOADING SCREEN", percent, message);
          } catch (error) {
            console.log(error);
          }
        });

        client.on("change_state", (state: any) => {
          console.log(user + " CHANGE STATE", state);
        });

        client.on('message', message => {
          console.log(message);
        });



        // setInterval(async () => {
        //   if (client) {
        //     const state = await client.getState();
        //     console.log(user + " Status:", state);
        //     if (state) {
        //       io.to(user).emit("message", state);
        //       io.to(user).emit("qr", null);
        //     } else {
        //       io.to(user).emit("message", "Get Status ..");
        //       io.to(user).emit("qr", null);
        //     }
        //   }
        // }, 3000);

        // Save client
        this.clients[`${user}`] = client;
      } catch (error) {
        console.log(error)
      }
    }

  }

  private getAccount = async () => {
    const accounts = await WhatsappClientModel.find({}, { _id: 1 });
    if (accounts.length > 0) {
      for (const account of accounts) {
        this.InitialClient(account._id);
      }
    }
  }

  public getClient(user: string) {
    return this.clients[user];
  }

  constructor(store: any) {
    this.store = store;
    this.getAccount();


    io.on("connection", (socket: any) => {
      socket.on("get qr", (room: String) => {
        socket.join(room);
        console.log("User Joined Room: " + room);
        this.pushMessage(`${room}`)
        console.log("Dddd");
      });
    })




    const setDataWa = async (req: Request | any, res: Response, next: NextFunction) => {
      req.accounts = this.clients;
      req.InitialClient = this.InitialClient;
      req.store = store;
      next();
    };

    system.app.use("/whatsapp", AuthMiddleware, setDataWa, WhatsAppClientRoutes);


  }
}

export default WhatsAppBoot;


import { Client } from "whatsapp-web.js";
import { system, io } from "..";
import { NextFunction, Request, Response } from "express";
import { WhatsAppClientRoutes } from "../routes";
import { AuthMiddleware } from "../middleware";


const {
  RemoteAuth,
} = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");

class WhatsAppBoot {
  private clients: Record<string, any> = {};

  InitialClient = (user: String, store: any) => {
    if (store) {
      try {
        const client: Client = new Client({
          authStrategy: new RemoteAuth({
            store: store,
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
          qrcode.generate(qr, { small: true });
          try {
            qrcode.toDataURL(qr, (err: any, url: any) => {
              io.to(user).emit("qr", url);
              io.to(user).emit("message", "QR Code received,scan please .");
            });
          } catch (error) {
            io.to(user).emit("message", "QR Code Failded to Call! .");
          }
        });

        client.on("ready", () => {
          console.log(user + " Client is ready!");
          io.to(user).emit("message", "Client is ready!");
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

  public getClient(user: string) {
    return this.clients[user];
  }

  constructor(store: any) {
    this.InitialClient("client1", store);
    this.InitialClient("client2", store);

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

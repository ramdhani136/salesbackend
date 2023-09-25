
import { Client } from "whatsapp-web.js";
import { system, io } from "..";
import { NextFunction, Request, Response } from "express";


const {
  RemoteAuth,
} = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");

class WhatsAppBoot {
  private clients: Record<string, any> = {};

  public InitialClient = (user: String, store: any) => {
    if (store) {
      const client: Client = new Client({
        authStrategy: new RemoteAuth({
          store: store,
          backupSyncIntervalMs: 300000,
          // puppeteer: {
          //   headless: true,
          //   args: [
          //     "--no-sanbox",
          //     "--disable-setuid-sandbox",
          //     "--disable-dev-shm-usage",
          //     "--disable-accelerated-2d-canvas",
          //     "--no-first-run",
          //     "--no-zygote",
          //     "--single-process",
          //     "--disable-gpu",
          //   ],
          // },
          clientId: user,
        }),
      });


      client.initialize();

      client.on("qr", (qr: any) => {
        console.log(user);
        qrcode.generate(qr, { small: true });
        try {
          qrcode.toDataURL(qr, (err: any, url: any) => {
            io.emit("qr", url);
            io.emit("message", "QR Code received,scan please .");
          });
        } catch (error) {
          io.emit("message", "QR Code Failded to Call! .");
        }
      });

      client.on("ready", () => {
        console.log(user + " Client is ready!");
        io.emit("message", "Client is ready!");
        io.emit("qr", null);
      });

      client.on("remote_session_saved", () => {
        console.log(user + " Session Saved");
        io.emit("message", "Session Saved!");
      });

      client.on("authenticated", (session: any) => {
        console.log(user + " authenticated");
        io.emit("message", "Whatsapp is authenticated!");
      });

      client.on("auth_failure", (session: any) => {
        io.emit("message", "Auth eror ,restarting...");
        console.log(user + " auth_failure");;
        client.initialize();
      });

      client.on("disconnected", (reason: any) => {
        io.emit("message", "Whatsapp is disconnected!");
        console.log(user + " disconnected");
        client.initialize();
      });


      client.on("loading_screen", (percent: any, message: any) => {
        try {
          console.log(user + " LOADING SCREEN", percent, message);
        } catch (error) {
          console.log(error);
        }
      });

      client.on("change_state", (state: any) => {
        console.log(user + " CHANGE STATE", state);
      });

      setInterval(async () => {
        const state = await client.getState();
        console.log(user + " Status:", state);
        if (state) {
          io.emit("message", state);
          io.emit("qr", null);
        } else {
          io.emit("message", "Get Status ..");
          io.emit("qr", null);
        }
      }, 10000);

      // Save client
      this.clients[`${user}`] = client;
    }

  }

  public getClient(user: string) {
    return this.clients[user];
  }

  constructor(store: any) {
    this.InitialClient("client1", store);
    this.InitialClient("client2", store);

    // system.app.use((req: Request | any, res: Response, next: NextFunction) => {
    //   req.waclient = "cobaa";
    //   next();
    // });
    // system.app.get('/cobain', async (req: Request, res: Response) => {
    //   let status: string;
    //   const client = await this.getClient("client1");
    //   if (client) {
    //     const state = await client.getState()
    //     status = state;
    //   } else {
    //     status = "Not Connected";
    //   }
    //   return res.send(status);
    // });



  }
}

export default WhatsAppBoot;

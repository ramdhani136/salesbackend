
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
          io.to(user).emit("loading", true);
          io.to(user).emit("message", "Loading ..");

          // await isClient.destroy();
          // delete this.clients[`${user}`]
          // await isClient.initialize();

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

  InitialClient = ({ user, deleteWhenNotActive }: { user: string, deleteWhenNotActive?: boolean }) => {

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
          if (!deleteWhenNotActive) {
            console.log(user + qr);
            // qrcode.generate(qr, { small: true });
            io.to(user).emit("loading", true);
            try {
              qrcode.toDataURL(qr, (err: any, url: any) => {
                io.to(user).emit("qr", url);
                io.to(user).emit("message", "QR Code received,scan please .");
              });
            } catch (error) {
              console.log(error);
              io.to(user).emit("message", "QR Code Failded to Call! .");
            }
            io.to(user).emit("loading", false);
          } else {
            console.log(user + " Destroy");
            client.destroy();
            delete this.clients[user];
          }
        });

        client.on("ready", () => {
          console.log(user + " Client is ready!");
          io.to(user).emit("message", "Client is connected!");
          io.to(user).emit("qr", null);
          io.to(user).emit("loading", false);
        });

        client.on("remote_session_saved", () => {
          console.log(user + " Session Saved");
          io.to(user).emit("message", "Session Saved!");
        });

        client.on("authenticated", (session: any) => {
          io.to(user).emit("loading", true);
          console.log(user + " authenticated");
          io.to(user).emit("message", "Whatsapp is authenticated!");
        });

        client.on("auth_failure", async (session: any) => {
          io.to(user).emit("loading", true);
          io.to(user).emit("message", "Auth eror ,restarting...");
          console.log(user + " auth_failure");;
          delete this.clients[user];
          io.to(user).emit("reset", 10000);
          await client.initialize();
          this.clients[`${user}`] = client;
          io.to(user).emit("loading", false);

        });

        client.on("disconnected", async (reason: any) => {
          io.to(user).emit("loading", true);
          io.to(user).emit("message", "Whatsapp is disconnected!");
          console.log(user + " disconnected");
          delete this.clients[user];
          io.to(user).emit("reset", 10000);
          await this.InitialClient({ user: user });
        });


        client.on("loading_screen", (percent: any, message: any) => {
          io.to(user).emit("loading", true);
          try {
            io.to(user).emit("message", "Connecting ..");
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
        console.log("Ddddddddddddddd");
        console.log(error)
      }
    }

  }

  private getAccount = async () => {
    const accounts = await WhatsappClientModel.find({}, { _id: 1 });
    if (accounts.length > 0) {
      for (const account of accounts) {
        this.InitialClient({ user: account._id, deleteWhenNotActive: true });
      }
    }
  }

  public getClient(user: string) {
    return this.clients[user];
  }

  constructor(store: any) {
    console.log("DIJALANKAN!")
    this.store = store;
    this.getAccount();


    io.on("connection", (socket: any) => {
      socket.on("open", (room: String) => {
        try {
          socket.join(room);
          console.log("User Joined Room: " + room);
          const client = this.clients[`${room}`]
          if (client) {
            this.pushMessage(`${room}`)
          } else {
            io.to(`${room}`).emit("loading", true);
            io.to(`${room}`).emit("message", "Loading ..");
            this.InitialClient({ user: `${room}` });
          }
        } catch (error) {
          console.log(error)
        }
      });


      socket.on("close", async (room: String) => {
        try {
          console.log("User Unjoint Room: " + room);
          const client: Client = this.clients[`${room}`]
          if (client) {
            console.log(await client.getState());
            if (await client.getState() !== "CONNECTED") {
              console.log("Akan di destory");
            }
          }
        } catch (error) {
          console.log(error)
        }
      });

      socket.on("qrrefresh", async (room: String) => {
        try {
          const client: Client = this.clients[`${room}`]
          if (client) {
            console.log('Get Refresh Qr');
            if (await client.getState() !== "CONNECTED") {
              io.to(`${room}`).emit("loading", true);
              io.to(`${room}`).emit("message", "Waiting for new qr :)");
              delete this.clients[`${room}`];
              await client.destroy();
              this.InitialClient({ user: `${room}` });
            }
          }
        } catch (error) {
          console.log(error)
        }
      });

      socket.on("logout", async (room: String) => {
        try {
          const client: Client = this.clients[`${room}`]
          if (client) {
            console.log('Logout');
            if (await client.getState() === "CONNECTED") {
              io.to(`${room}`).emit("loading", true);
              io.to(`${room}`).emit("message", "Waiting .. :)");
              delete this.clients[`${room}`];
              await client.logout();
              await client.destroy();
              this.InitialClient({ user: `${room}` });
            }
          }
        } catch (error) {
          console.log(error)
        }
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

import { io } from "..";
const { Client, RemoteAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode");

class WhatsAppBoot {
  public client: any;
  constructor(store: any) {
    this.client = new Client({
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
      }),
    });

    this.client.initialize();

    this.client.on("qr", (qr: any) => {
      console.log(`QR RECEIVED ${qr}`);
      try {
        qrcode.toDataURL(qr, (err: any, url: any) => {
          io.emit("qr", url);
          io.emit("message", "QR Code received,scan please .");
        });
      } catch (error) {
        io.emit("message", "QR Code Failded to Call! .");
      }
    });

    this.client.on("ready", () => {
      console.log("Client is ready!");
      io.emit("message", "Client is ready!");
      io.emit("qr", null);
    });

    this.client.on("remote_session_saved", () => {
      console.log("Session Saved");
      io.emit("message", "Session Saved!");
    });

    this.client.on("authenticated", (session: any) => {
      console.log("authenticated");
      io.emit("message", "Whatsapp is authenticated!");
    });

    this.client.on("auth_failure", (session: any) => {
      io.emit("message", "Auth eror ,restarting...");
      console.log("auth_failure");
      this.client.destroy();
      this.client.initialize();
    });

    this.client.on("disconnected", (reason: any) => {
      io.emit("message", "Whatsapp is disconnected!");
      console.log("disconnected");
      this.client.destroy();
      this.client.initialize();
    });
  }
}

export default WhatsAppBoot;

import { Server } from "socket.io";

class SocketIO {
  public server: any;
  public io: any;

  constructor(server: any) {
    this.server = server;
    this.io = new Server(this.server, {
      cors: {
        origin: ["*", "http://localhost:5173"],
        methods: ["GET", "POST"],
        allowedHeaders: ["react-client"],
        credentials: true,
      },
    });
  }
}

export default SocketIO;

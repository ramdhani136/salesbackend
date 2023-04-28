import { ChatController } from "../controllers";
import RouteBase from "./RouteBase";

const Controller = ChatController;

class ChatRoutes extends RouteBase {
  routes(): void {
    this.router.post("/", Controller.accessChat);
    this.router.get("/", Controller.fetchChats);
  }
}

export default new ChatRoutes().router;

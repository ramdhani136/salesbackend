import { MessageController } from "../controllers";
import RouteBase from "./RouteBase";

const Controller = MessageController;

class MessageRoute extends RouteBase {
  routes(): void {
    this.router.get("/:chatId", Controller.allMessages);
    this.router.post("/", Controller.sendMessage);
  }
}

export default new MessageRoute().router;

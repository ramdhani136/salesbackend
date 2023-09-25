import { WhatsappClientController as Controller } from "../controllers";
import { DeletedValidMiddleware } from "../middleware";

import RouteBase from "./RouteBase";

class WhatsAppClientRoutes extends RouteBase {
  routes(): void {
    this.router.get("/account", Controller.index);
    this.router.post("/logout/:user", Controller.logout);
    this.router.post("/status/:user", Controller.getStatus);
    this.router.post("/refresh/:user", Controller.refresh);
    this.router.post("/account", Controller.create);
    this.router.get("/account/:id", Controller.show);
    this.router.delete("/account/:id", DeletedValidMiddleware, Controller.delete);
    this.router.put("/account/:id", Controller.update);
  }
}

export default new WhatsAppClientRoutes().router;

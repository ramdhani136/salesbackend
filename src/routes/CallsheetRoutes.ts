import { CallsheetController as Controller } from "../controllers";
import { CheckExpiredScheduleMiddleWare, DeleteValid } from "../middleware";
import RouteBase from "./RouteBase";

class CallsheetRoutes extends RouteBase {
  routes(): void {
    this.router.get("/", CheckExpiredScheduleMiddleWare, Controller.index);
    this.router.post("/", Controller.create);
    this.router.get("/:id", CheckExpiredScheduleMiddleWare, Controller.show);
    this.router.delete("/:id", DeleteValid, Controller.delete);
    this.router.put("/:id", Controller.update);
  }
}

export default new CallsheetRoutes().router;

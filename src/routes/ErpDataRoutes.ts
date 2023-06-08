import { ErpDataController as Controller } from "../controllers";
import RouteBase from "./RouteBase";

class ErpDataRoutes extends RouteBase {
  routes(): void {
    this.router.get("/:doc", Controller.index);
    this.router.get("/:doc/:id", Controller.show);
    this.router.put("/:doc/:id", Controller.update);
  }
}

export default new ErpDataRoutes().router;

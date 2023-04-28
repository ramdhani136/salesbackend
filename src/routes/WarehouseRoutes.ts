import {  WarehouseController} from "../controllers";
import RouteBase from "./RouteBase";

const Controller = WarehouseController;

class HistoryRoutes extends RouteBase {
  routes(): void {
    this.router.get("/", Controller.index);
    this.router.post("/", Controller.create);
    this.router.get("/:id", Controller.show);
    this.router.delete("/:id", Controller.delete);
    this.router.put("/:id", Controller.update);
  }
}

export default new HistoryRoutes().router;



import { ScheduleItemPackingController } from "../controllers";
import { AuthMiddleware } from "../middleware/AuthMiddleware";
import RouteBase from "./RouteBase";

class ScheduleRoutes extends RouteBase {
  routes(): void {
    this.router.get("/", ScheduleItemPackingController.index);
    this.router.post("/", ScheduleItemPackingController.create);
    this.router.get("/:id", ScheduleItemPackingController.show);
    this.router.delete("/:id", ScheduleItemPackingController.delete);
    this.router.put("/:id", ScheduleItemPackingController.update);
  }
}

export default new ScheduleRoutes().router;

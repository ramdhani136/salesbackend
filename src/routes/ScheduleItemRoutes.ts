
import { ScheduleItemController } from "../controllers";
import { AuthMiddleware } from "../middleware/AuthMiddleware";
import RouteBase from "./RouteBase";

class ScheduleItemRoutes extends RouteBase {
  routes(): void {
    this.router.get("/", ScheduleItemController.index);
    // this.router.post("/", ScheduleItemController.create);
    this.router.get("/:id", ScheduleItemController.show);
    this.router.delete("/:id", ScheduleItemController.delete);
    this.router.put("/:id", ScheduleItemController.update);
  }
}

export default new ScheduleItemRoutes().router;

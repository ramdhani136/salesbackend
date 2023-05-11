import { ScheduleController } from "../controllers";
import { CheckExpiredSchedule, DeleteValid } from "../middleware";
import RouteBase from "./RouteBase";

class ScheduleRoutes extends RouteBase {
  routes(): void {
    this.router.get("/",CheckExpiredSchedule, ScheduleController.index);
    this.router.post("/", ScheduleController.create);
    this.router.get("/:id",CheckExpiredSchedule, ScheduleController.show);
    this.router.delete("/:id", DeleteValid, ScheduleController.delete);
    this.router.put("/:id", ScheduleController.update);
  }
}

export default new ScheduleRoutes().router;

import { ScheduleController } from "../controllers";
import {
  CheckExpiredScheduleMiddleWare,
  DeletedValidMiddleware,
} from "../middleware";
import RouteBase from "./RouteBase";

class ScheduleRoutes extends RouteBase {
  routes(): void {
    this.router.get(
      "/",
      CheckExpiredScheduleMiddleWare,
      ScheduleController.index
    );
    this.router.post("/", ScheduleController.create);
    this.router.get(
      "/:id",
      CheckExpiredScheduleMiddleWare,
      ScheduleController.show
    );
    this.router.delete(
      "/:id",
      DeletedValidMiddleware,
      ScheduleController.delete
    );
    this.router.put("/:id", ScheduleController.update);
  }
}

export default new ScheduleRoutes().router;

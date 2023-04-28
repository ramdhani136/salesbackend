import { ScheduleController } from "../controllers";
import { DeleteValid } from "../middleware";
import { AuthMiddleware } from "../middleware/AuthMiddleware";
import RouteBase from "./RouteBase";

class ScheduleRoutes extends RouteBase {
  routes(): void {
    this.router.get("/", ScheduleController.index);
    this.router.post("/", ScheduleController.create);
    this.router.get("/:id", ScheduleController.show);
    this.router.delete("/:id", DeleteValid, ScheduleController.delete);
    this.router.put("/:id", ScheduleController.update);
    this.router.get("/refresh/:schedule", ScheduleController.onRefreshItem);
  }
}

export default new ScheduleRoutes().router;

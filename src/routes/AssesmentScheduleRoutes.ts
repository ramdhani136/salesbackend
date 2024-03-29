import { AssesmentScheduleController as Controller } from "../controllers";
import { DeletedValidMiddleware } from "../middleware";

import RouteBase from "./RouteBase";

class AssesmentScheduleRoutes extends RouteBase {
  routes(): void {
    this.router.get("/", Controller.index);
    this.router.post("/", Controller.create);
    this.router.get("/:id", Controller.show);
    this.router.post("/duplicate/:id", Controller.getDuplicate);
    this.router.delete("/:id",DeletedValidMiddleware, Controller.delete);
    this.router.put("/:id", Controller.update);
  }
}

export default new AssesmentScheduleRoutes().router;

import { AssesmentTemplateController as Controller } from "../controllers";
import { DeletedValidMiddleware } from "../middleware";

import RouteBase from "./RouteBase";

class AssesmentTemplateRoutes extends RouteBase {
  routes(): void {
    this.router.get("/", Controller.index);
    this.router.post("/", Controller.create);
    this.router.get("/:id", Controller.show);
    this.router.delete("/:id",DeletedValidMiddleware, Controller.delete);
    this.router.put("/:id", Controller.update);
  }
}

export default new AssesmentTemplateRoutes().router;

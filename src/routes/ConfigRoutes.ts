import { ConfigController as Controller } from "../controllers";

import RouteBase from "./RouteBase";

class ConfigRoutes extends RouteBase {
  routes(): void {
    this.router.get("/", Controller.show);
    this.router.put("/:id", Controller.update);
  }
}

export default new ConfigRoutes().router;

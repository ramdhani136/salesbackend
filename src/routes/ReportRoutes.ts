import { ReportController as Controller } from "../controllers";

import RouteBase from "./RouteBase";

class ReportRoutes extends RouteBase {
  routes(): void {
    this.router.get("/countedocperuser", Controller.countPerUser);
    this.router.get("/counterdoc", Controller.counterDoc);

  }
}

export default new ReportRoutes().router;

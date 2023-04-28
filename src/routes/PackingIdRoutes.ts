import {  PackingIDCOntroller} from "../controllers";
import RouteBase from "./RouteBase";

const Controller = PackingIDCOntroller;

class HistoryRoutes extends RouteBase {
  routes(): void {
    this.router.get("/", Controller.index);
    this.router.get("/:id", Controller.show);
  }
}

export default new HistoryRoutes().router;

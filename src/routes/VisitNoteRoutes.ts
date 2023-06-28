import { VisitNoteController as Controller } from "../controllers";
import RouteBase from "./RouteBase";

class VisitNoteRoutes extends RouteBase {
  routes(): void {
    this.router.get("/", Controller.index);
    this.router.post("/", Controller.create);
    this.router.get("/:id", Controller.show);
    this.router.get("/visit/:id", Controller.ByVisit);
    this.router.delete("/:id", Controller.delete);
    this.router.put("/:id", Controller.update);
  }
}

export default new VisitNoteRoutes().router;

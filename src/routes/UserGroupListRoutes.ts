import { UserGroupListController as Controller } from "../controllers";
import { DeleteValid } from "../middleware";
import RouteBase from "./RouteBase";

class UserGrouListRoutes extends RouteBase {
  routes(): void {
    this.router.get("/", Controller.index);
    this.router.post("/", Controller.create);
    this.router.get("/:id", Controller.show);
    this.router.delete("/:id", DeleteValid, Controller.delete);
    this.router.put("/:id", Controller.update);
  }
}

export default new UserGrouListRoutes().router;

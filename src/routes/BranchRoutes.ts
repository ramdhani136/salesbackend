import { BranchController } from "../controllers";
import { DeleteValid } from "../middleware";
import RouteBase from "./RouteBase";


class ScheduleRoutes extends RouteBase {
  routes(): void {
    this.router.get("/",BranchController.index);
    this.router.post("/", BranchController.create);
    this.router.get("/:id", BranchController.show);
    this.router.delete("/:id", DeleteValid, BranchController.delete);
    this.router.put("/:id",BranchController.update);
  }
}

export default new ScheduleRoutes().router;

import { UserController } from "../controllers";
import { DeleteValid } from "../middleware";
import { AuthMiddleware } from "../middleware/AuthMiddleware";
import RouteBase from "./RouteBase";

class UserRoutes extends RouteBase {
  routes(): void {
    this.router.get("/", AuthMiddleware, UserController.index);
    this.router.post("/", AuthMiddleware, UserController.create);
    this.router.post("/login", UserController.login);
    this.router.get("/token", UserController.refreshToken);
    this.router.delete("/logout", UserController.logout);
    this.router.get("/:id", AuthMiddleware, UserController.show);
    this.router.delete(
      "/:id",
      AuthMiddleware,
      DeleteValid,
      UserController.delete
    );
    this.router.put("/:id", AuthMiddleware, UserController.update);
  }
}

export default new UserRoutes().router;

import { UserController } from "../controllers";
import { RoleMiddleware } from "../middleware";
import { AuthMiddleware } from "../middleware/AuthMiddleware";
import RouteBase from "./RouteBase";
import multer from "multer";
import path from "path";
import { DeletedValidMiddleware } from "../middleware/DeleteValidMiddleware";

const uploadPath = path.join(__dirname, "../assets/images");
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage: storage });

class UserRoutes extends RouteBase {
  routes(): void {
    this.router.get("/", AuthMiddleware, UserController.index);
    this.router.post(
      "/",
      upload.single("img"),
      AuthMiddleware,
      RoleMiddleware,
      UserController.create
    );
    this.router.post("/login", UserController.login);
    this.router.get("/token", UserController.refreshToken);
    this.router.delete("/logout", UserController.logout);
    this.router.get(
      "/:id",
      AuthMiddleware,
      RoleMiddleware,
      UserController.show
    );
    this.router.delete(
      "/:id",
      AuthMiddleware,
      RoleMiddleware,
      DeletedValidMiddleware,
      UserController.delete
    );
    this.router.put(
      "/:id",
      AuthMiddleware,
      RoleMiddleware,
      upload.single("img"),
      UserController.update
    );
  }
}

export default new UserRoutes().router;

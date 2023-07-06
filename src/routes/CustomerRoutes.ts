import { CustomerController as Controller } from "../controllers";
import { DeletedValidMiddleware } from "../middleware";
import multer from "multer";
import path from "path";
import RouteBase from "./RouteBase";

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

class CustomerRoutes extends RouteBase {
  routes(): void {
    this.router.get("/", Controller.index);
    this.router.post("/",  upload.single("img"),Controller.create);
    this.router.get("/:id", Controller.show);
    this.router.delete("/:id", DeletedValidMiddleware, Controller.delete);
    this.router.put("/:id", upload.single("img"), Controller.update);
  }
}

export default new CustomerRoutes().router;

import { MemoController as Controller } from "../controllers";
import { CheckExpireMemoMiddleware } from "../middleware/CekExpiredMemoMiddleware";
import RouteBase from "./RouteBase";
import multer from "multer";
import path from "path";

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

class MemoRoutes extends RouteBase {
  routes(): void {
    this.router.get("/", CheckExpireMemoMiddleware, Controller.index);
    this.router.post("/", upload.single("img"), Controller.create);
    this.router.get("/:id", CheckExpireMemoMiddleware, Controller.show);
    this.router.delete("/:id", Controller.delete);
    this.router.put("/:id", upload.single("img"), Controller.update);
  }
}

export default new MemoRoutes().router;

import {
  VisitController as Controller,
  ScheduleController,
} from "../controllers";
import { CheckExpiredSchedule, DeleteValid } from "../middleware";
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

class VisitRoutes extends RouteBase {
  routes(): void {
    this.router.get(
      "/",
      CheckExpiredSchedule,
      Controller.index
    );
    this.router.post("/", upload.single("img"), Controller.create);
    this.router.get(
      "/:id",
      CheckExpiredSchedule,
      Controller.show
    );
    this.router.delete("/:id", DeleteValid, Controller.delete);
    this.router.put("/:id", upload.single("img"), Controller.update);
  }
}

export default new VisitRoutes().router;

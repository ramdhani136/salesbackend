import { NextFunction, Request, Response } from "express";
import { FileController as Controller } from "../controllers";

import RouteBase from "./RouteBase";
import multer from "multer";
import path from "path";

const uploadPath = path.join(__dirname, "../assets/files");
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 2 * 1024 * 1024,
  },
});

function handleUploadError(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(500).json({
        status: 500,
        msg: "File size should not exceed 2 MB.",
      });
    }
  }
  next(err);
}

class FileRoutes extends RouteBase {
  routes(): void {
    this.router.get("/", Controller.index);
    this.router.post(
      "/",
      upload.single("file"),
      handleUploadError,
      Controller.create
    );
    this.router.get("/:id", Controller.show);
    this.router.delete("/:id", Controller.delete);
    this.router.put("/:id", upload.single("file"), Controller.update);
  }
}

export default new FileRoutes().router;

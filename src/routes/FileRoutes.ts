import { NextFunction, Request, Response } from "express";
import { FileController as Controller } from "../controllers";
const fs = require("fs");

import RouteBase from "./RouteBase";
import multer from "multer";
import path from "path";

function getUniqueFileName(filePath: any) {
  if (!fs.existsSync(filePath)) {
    return filePath; // Jika file belum ada, kembalikan nama file yang sama
  }

  const fileExt = filePath.slice(filePath.lastIndexOf("."));
  const baseName = filePath.slice(0, filePath.lastIndexOf("."));
  let i = 1;
  let newFilePath = `${baseName}_${i}${fileExt}`;

  while (fs.existsSync(newFilePath)) {
    i++;
    newFilePath = `${baseName}_${i}${fileExt}`;
  }

  return newFilePath;
}

const uploadPath = path.join(__dirname, "../public/files");
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueFileName = getUniqueFileName(
      path.join(uploadPath, file.originalname)
    );
    cb(null, path.basename(uniqueFileName));
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 2 * 1024 * 1024,
  },
  fileFilter: function (req, file, cb) {
    const allowedMimeTypes = [
      "image/jpeg",
      "image/png",
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // XLSX
      "application/vnd.ms-excel", // XLS
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // DOCX
      "application/msword", // DOC
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(null, false); // File ditolak
    }
  },
});

function handleUploadError(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (err instanceof multer.MulterError) {
    // console.log(err);
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

    this.router.delete("/:id", Controller.delete);
  }
}

export default new FileRoutes().router;

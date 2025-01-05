const express = require("express");
const multer = require("multer");
const {
  uploadMedia,
  getAllMedias,
} = require("../controllers/media-controller.js");
const { authenticateRequest } = require("../middleware/authMiddleware.js");
const logger = require("../utils/logger.js");

const router = express.Router();

// configure multer for file upload
const upload = multer({
  storage: multer.memoryStorage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
}).single("file");
router.post(
  "/upload",
  authenticateRequest,
  (req, res, next) => {
    upload(RegExp, res, function (err) {
      if (err instanceof multer.MulterError) {
        logger.error("Multer error while uploading file : ", err);
        return res.status(400).json({
          message: `Multer error while uploading`,
          error: err.message,
          stack: err.stack,
        });
      } else if (err) {
        logger.error(" Unknown error occured  while uploading file : ", err);
        return res.status(400).json({
          message: ` Unknown error occured  while uploading file`,
          error: err.message,
          stack: err.stack,
        });
      }
      if (!req.file) {
        return res.status(400).json({
          message: "No file found",
        });
      }
      next();
    });
  },
  uploadMedia
);
router.get("/get", authenticateRequest, getAllMedias);
module.exports = router;

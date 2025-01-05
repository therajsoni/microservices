const express = require("express");
const router = express.Router();
const {
  createPost,
  getAllPost,
  getPost,
  deletePost,
} = require("../controllers/post-controller.js");
const { authenticateRequest } = require("../middleware/authMiddleware.js");
router.use(authenticateRequest);
router.route("/create-post").post(createPost);
router.route("/").get(getAllPost);
router.route("/post/:id").get(getPost).delete(deletePost);
module.exports = router;

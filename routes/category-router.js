const express = require("express");
const router = express.Router();
const {
  getAllCategory,
  getOneCategory,
  createCategory,
  updateCategory,
  deleteCategory,
} = require("../controller/category-controller");
const auth = require("../middlewares/auth");
const categoryFiles = require("../middlewares/categoryFiles");

router.get("/", getAllCategory);
router.get("/:id", getOneCategory);
router.post("/", auth, categoryFiles, createCategory);
router.patch("/:id", auth, categoryFiles, updateCategory);
router.delete("/:id", auth, deleteCategory);

module.exports = router;

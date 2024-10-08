const express = require("express");
const router = express.Router();
const {
  getSiteSetting,
  createSiteSetting,
  updateSiteSetting,
} = require("../controller/sitesetting-controller");
const auth = require("../middlewares/auth");
const siteFiles = require("../middlewares/siteFiles");

router.get("/", getSiteSetting);
router.post("/", auth, siteFiles, createSiteSetting);
router.patch("/:id", auth, siteFiles, updateSiteSetting);

module.exports = router;

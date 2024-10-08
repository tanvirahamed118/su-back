const express = require("express");
const router = express.Router();
const {
  createPerticipation,
  getAllPerticipation,
  getAllPerticipationById,
  updatePerticipationStatus,
} = require("../controller/perticipation-controller");
const auth = require("../middlewares/auth");

router.get("/", auth, getAllPerticipation);
router.get("/:id", auth, getAllPerticipationById);
router.post("/", auth, createPerticipation);
router.patch("/status/:id", auth, updatePerticipationStatus);

module.exports = router;

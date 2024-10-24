const express = require("express");
const router = express.Router();
const {
  createPerticipation,
  getAllPerticipation,
  getAllPerticipationById,
  updatePerticipationStatus,
  getAllPerticipationBySeller,
  updatePerticipationStatusBySeller,
} = require("../controller/perticipation-controller");
const auth = require("../middlewares/auth");

router.get("/seller", auth, getAllPerticipationBySeller);
router.get("/", auth, getAllPerticipation);
router.get("/:id", auth, getAllPerticipationById);
router.post("/", auth, createPerticipation);
router.patch("/seller/:id", auth, updatePerticipationStatusBySeller);
router.patch("/status/:id", auth, updatePerticipationStatus);

module.exports = router;

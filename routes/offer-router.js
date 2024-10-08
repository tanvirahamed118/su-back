const express = require("express");
const router = express.Router();
const {
  getAllOffer,
  createOffer,
  getOneOffer,
  updateOfferStatus,
  getAllOfferDefault,
} = require("../controller/offer-controller");
const auth = require("../middlewares/auth");

router.get("/default", auth, getAllOfferDefault);
router.get("/", auth, getAllOffer);
router.post("/", auth, createOffer);
router.get("/:id", auth, getOneOffer);
router.patch("/:id", auth, updateOfferStatus);
router.delete("/:id", auth, createOffer);

module.exports = router;

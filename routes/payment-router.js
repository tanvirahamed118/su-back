const express = require("express");
const router = express.Router();
const {
  createMembershipPayment,
  getAllPayment,
  getSinglePayment,
  deletePayment,
  createCreditsPayment,
  getAllTransactions,
  updatePaymentMembershipStatus,
  updatePaymentCredit,
} = require("../controller/payment-controller");
const auth = require("../middlewares/auth");

router.get("/transaction", auth, getAllTransactions);
router.get("/", auth, getAllPayment);
router.get("/:id", auth, getSinglePayment);
router.post("/credit", createCreditsPayment);
router.post("/:id", createMembershipPayment);
router.post("/:id", deletePayment);
router.patch("/membership", auth, updatePaymentMembershipStatus);
router.patch("/credit", auth, updatePaymentCredit);

module.exports = router;

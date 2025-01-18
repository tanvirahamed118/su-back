const express = require("express");
const router = express.Router();
const {
  createMembershipPayment,
  getAllPayment,
  getSinglePayment,
  deletePayment,
  createCreditsPayment,
  getAllTransactions,
  createMembershipTransaction,
  createCreditTransaction,
  createdemoPayment,
} = require("../controller/payment-controller");
const auth = require("../middlewares/auth");

router.get("/transaction", auth, getAllTransactions);
router.get("/", auth, getAllPayment);
router.get("/:id", auth, getSinglePayment);
router.post("/credit", createCreditsPayment);
router.post("/demo", createdemoPayment);
router.post("/:id", createMembershipPayment);
router.post("/:id", deletePayment);
router.post("/create/transaction/credits", createCreditTransaction);
router.post("/create/transaction", createMembershipTransaction);

module.exports = router;

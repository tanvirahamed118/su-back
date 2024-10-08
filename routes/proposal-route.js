const express = require("express");
const router = express.Router();
const {
  getAllProposal,
  getSingleProposal,
  createProposal,
  updateProposalStatusByClient,
  updateProposalStatusBySeller,
  deleteProposal,
  updateProposal,
  getSingleProposalByClient,
  proposalReviewRequest,
  getAllProposalsByAdmin,
  getAllProposalDefault,
  updateProposalView,
} = require("../controller/proposal-controller");
const auth = require("../middlewares/auth");
const offerFiles = require("../middlewares/offerFiles");

router.get("/default", auth, getAllProposalDefault);
router.get("/status", auth, getAllProposalsByAdmin);
router.get("/", auth, getAllProposal);
router.get("/:id", auth, getSingleProposal);
router.get("/:sellerId/:jobId", getSingleProposalByClient);
router.post("/", offerFiles, createProposal);
router.patch("/view/:id", auth, updateProposalView);
router.patch("/review/request/:id", auth, proposalReviewRequest);
router.patch("/status/client", auth, updateProposalStatusByClient);
router.patch("/status/seller", auth, updateProposalStatusBySeller);
router.patch("/:id", auth, offerFiles, updateProposal);
router.delete("/:id", auth, deleteProposal);

module.exports = router;

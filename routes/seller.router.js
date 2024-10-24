const express = require("express");
const router = express.Router();
const {
  getSeller,
  getOneSeller,
  register,
  login,
  otpSend,
  otpCheck,
  changePassword,
  updateSeller,
  updateSellerStatus,
  deleteSeller,
  updateSellerActivity,
  updateSellerCompany,
  sellerEmailVarification,
  getAllSellersByAdmin,
  updateSellerStatusByAdmin,
  createSellerByAdmin,
  deleteSellerCompanyPictures,
  uploadSellerAddress,
} = require("../controller/seller-controller");
const auth = require("../middlewares/auth");
const userFiles = require("../middlewares/companyImages");
const addressFile = require("../middlewares/addressFile");

router.post("/change", changePassword);
router.patch("/company/:id", auth, userFiles, updateSellerCompany);
router.get("/access/admin", getAllSellersByAdmin);
router.get("/verify-email", sellerEmailVarification);
router.get("/", getSeller);
router.get("/:id", getOneSeller);
router.post("/admin", createSellerByAdmin);
router.post("/register", register);
router.post("/login", login);
router.post("/otp", otpSend);
router.post("/otp/check", otpCheck);
router.patch("/update/:id", auth, deleteSellerCompanyPictures);
router.patch("/upload/:id", auth, addressFile, uploadSellerAddress);
router.patch("/access/status", auth, updateSellerStatusByAdmin);
router.patch("/:id", auth, updateSeller);
router.patch("/activity/:id", auth, updateSellerActivity);
router.patch("/status/:id", auth, updateSellerStatus);
router.delete("/:id", auth, deleteSeller);

module.exports = router;

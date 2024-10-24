const MembershipModel = require("../models/membership.model");
const SellerModel = require("../models/seller-model");

// get one Membership
const getOneMembership = async (req, res) => {
  const { id } = req.params;
  try {
    const Membership = await MembershipModel.findOne({ _id: id });
    res.status(200).json(Membership);
  } catch (error) {
    res.status(500).json(error);
  }
};

// get all Membership
async function getAllMembership(req, res) {
  try {
    const Membership = await MembershipModel.find();
    res.status(200).json(Membership);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// create Membership
const createMembership = async (req, res) => {
  const {
    title,
    savePrice,
    existPrice,
    currentPrice,
    shortNote,
    featureOne,
    featureTow,
    featureThree,
    featureFour,
    featureFive,
    credit,
    plan,
  } = req.body;
  try {
    const createData = new MembershipModel({
      title,
      savePrice,
      existPrice,
      currentPrice,
      shortNote,
      featureOne,
      featureTow,
      featureThree,
      featureFour,
      featureFive,
      credit,
      plan,
    });
    await createData.save();
    res.status(200).json({ message: "Membership create successful" });
  } catch (error) {
    res.status(500).json({ error: error, message: "request Faild!" });
  }
};

// cancel Membership
const cancelMembership = async (req, res) => {
  const { id } = req.params;
  const existSeller = await SellerModel.findOne({ _id: id });
  try {
    if (existSeller) {
      const updateSeller = {
        memberShip: {},
        memberShipStatus: "not-complete",
        credits: 0,
      };
      await SellerModel.findByIdAndUpdate(id, updateSeller, {
        new: true,
      });
      res.status(200).json({ message: "Membership cancel successful" });
    }
  } catch (error) {
    res.status(500).json({ error: error, message: "request Faild!" });
  }
};

// update Membership
const updateMembership = async (req, res) => {
  const { id } = req.params;
  const {
    title,
    savePrice,
    existPrice,
    currentPrice,
    shortNote,
    featureOne,
    featureTow,
    featureThree,
    featureFour,
    featureFive,
  } = req.body;
  try {
    const existMembership = await MembershipModel.findOne({ _id: id });
    if (existMembership) {
      const updateData = new MembershipModel({
        title,
        savePrice,
        existPrice,
        currentPrice,
        shortNote,
        featureOne,
        featureTow,
        featureThree,
        featureFour,
        featureFive,
      });
      await MembershipModel.findByIdAndUpdate(id, updateData, {
        new: true,
      });
      res.status(200).json({ message: "Membership update successful" });
    } else {
      res.status(200).json({ message: "Membership not found!" });
    }
  } catch (error) {
    res.status(500).json({ error: error, message: "request Faild!" });
  }
};

// delete Membership
const deleteMembership = async (req, res) => {
  const { id } = req.params;
  const existMembership = await MembershipModel.findOne({ _id: id });

  try {
    if (existMembership) {
      await MembershipModel.findByIdAndDelete(id);
      res.status(200).json({ message: "Delete successful" });
    } else {
      res.status(200).json({ message: "Membership not found!" });
    }
  } catch (error) {
    res.status(500).json({ error: error, message: "Update Faild!" });
  }
};

module.exports = {
  getOneMembership,
  getAllMembership,
  createMembership,
  updateMembership,
  deleteMembership,
  cancelMembership,
};

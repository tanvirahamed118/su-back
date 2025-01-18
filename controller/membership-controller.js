const MembershipModel = require("../models/membership.model");
const SellerModel = require("../models/seller-model");

// get one Membership
async function getOneMembership(req, res) {
  const { id } = req.params;
  try {
    const Membership = await MembershipModel.findOne({ _id: id });
    res.status(200).json(Membership);
  } catch (error) {
    res.status(500).json({ message: "Server Error!", error });
  }
}

// get all Membership
async function getAllMembership(req, res) {
  try {
    const Membership = await MembershipModel.find();
    res.status(200).json(Membership);
  } catch (error) {
    res.status(500).json({ message: "Server Error!", error });
  }
}

// get all Membership By Admin
async function getAllMembershipByAdmin(req, res) {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const skip = (pageNumber - 1) * limitNumber;
    const filter = {};
    if (status) {
      filter.status = status;
    }

    const memberships = await MembershipModel.find(filter)
      .skip(skip)
      .limit(limitNumber);
    const totalMemberships = await MembershipModel.countDocuments(filter);
    const totalPages = Math.ceil(totalMemberships / limitNumber);
    res.status(200).json({
      currentPage: pageNumber,
      totalPages,
      totalMemberships,
      memberships,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// create Membership
async function createMembership(req, res) {
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
    status,
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
      status,
    });
    await createData.save();
    res.status(200).json({ message: "Membership Create Successful" });
  } catch (error) {
    res.status(500).json({ message: "Server Error!", error });
  }
}

// cancel Membership
async function cancelMembership(req, res) {
  const { id } = req.params;
  const existSeller = await SellerModel.findOne({ _id: id });
  try {
    if (existSeller) {
      const updateSeller = {
        $unset: { memberShip: "" },
        memberShipStatus: "cancel",
        credits: 0,
      };
      await SellerModel.findByIdAndUpdate(id, updateSeller, {
        new: true,
      });
      res.status(200).json({ message: "Membership Cancel Successful" });
    }
  } catch (error) {
    res.status(500).json({ message: "Server Error!", error });
  }
}

// update Membership
async function updateMembership(req, res) {
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
    status,
  } = req.body;
  try {
    const existMembership = await MembershipModel.findOne({ _id: id });
    if (existMembership) {
      const updateData = {
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
        status,
      };
      await MembershipModel.findByIdAndUpdate(id, updateData, {
        new: true,
      });
      res.status(200).json({ message: "Membership update successful" });
    } else {
      res.status(200).json({ message: "Membership Not Found" });
    }
  } catch (error) {
    res.status(500).json({ message: "Server Error!", error });
  }
}

// delete Membership
async function deleteMembership(req, res) {
  const { id } = req.params;
  const existMembership = await MembershipModel.findOne({ _id: id });

  try {
    if (existMembership) {
      await MembershipModel.findByIdAndDelete(id);
      res.status(200).json({ message: "Delete Successful" });
    } else {
      res.status(200).json({ message: "Membership Not Found" });
    }
  } catch (error) {
    res.status(500).json({ message: "Server Error!", error });
  }
}

module.exports = {
  getOneMembership,
  getAllMembership,
  createMembership,
  updateMembership,
  deleteMembership,
  cancelMembership,
  getAllMembershipByAdmin,
};

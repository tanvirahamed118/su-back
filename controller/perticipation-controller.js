const JobModel = require("../models/job-model");
const PerticipationModel = require("../models/perticipation-model");
const SellerModel = require("../models/seller-model");

// get all Perticipation
const getAllPerticipationById = async (req, res) => {
  const { id } = req.params;
  try {
    const perticipation = await PerticipationModel.find({ jobId: id });
    res.status(200).json(perticipation);
  } catch (error) {
    res.status(500).json(error);
  }
};

// get all perticipations
async function getAllPerticipation(req, res) {
  try {
    const { page = 1, limit = 20, id } = req.query;
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    const skip = (pageNumber - 1) * limitNumber;
    const filter = {};

    if (id) {
      filter.jobId = id;
    }
    const participations = await PerticipationModel.find(filter)
      .skip(skip)
      .limit(limitNumber);
    const totalParticipations = await PerticipationModel.countDocuments(filter);
    const totalPages = Math.ceil(totalParticipations / limitNumber);
    const sellerIds = [...new Set(participations.map((p) => p.sellerId))];
    const sellers = await SellerModel.find({ _id: { $in: sellerIds } });
    const sellerDataMap = sellers.reduce((map, seller) => {
      map[seller._id.toString()] = seller;
      return map;
    }, {});

    const detailedParticipations = participations.map((participation) => ({
      ...participation._doc,
      sellerData: sellerDataMap[participation.sellerId.toString()] || null,
    }));

    res.status(200).json({
      currentPage: pageNumber,
      totalPages,
      totalParticipations,
      participations: detailedParticipations,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// create Perticipation
const createPerticipation = async (req, res) => {
  const { jobId, sellerId } = req.body;
  const existSeller = await SellerModel.findOne({ _id: sellerId });
  const {
    reviewRating,
    totalReview,
    reviewPercent,
    username,
    location,
    leagalForm,
    companyName,
    profilePic,
  } = existSeller || {};

  try {
    const PerticipationData = new PerticipationModel({
      sellerName: username,
      sellerRating: reviewRating,
      sellerReviews: totalReview,
      reviewPercent: reviewPercent,
      sellerLocation: location,
      sellerLegalForm: leagalForm,
      jobId: jobId,
      companyName,
      profilePic,
    });
    await PerticipationData.save();
    res.status(200).json("Created successful");
  } catch (error) {
    res.status(500).json({ error: error, message: "Create Faild!" });
  }
};

// update perticipation status
const updatePerticipationStatus = async (req, res) => {
  const { status, jobId } = req.body;
  const { id } = req.params;
  const existJob = await JobModel.findOne({ _id: jobId });
  const { placeBid, rejectBid } = existJob || {};
  const statusData = { status: status };
  try {
    const rejectJob = {
      placeBid: placeBid >= 1 ? placeBid - 1 : 0,
      rejectBid: rejectBid >= 1 ? rejectBid + 1 : 1,
    };
    const progressJob = {
      placeBid: placeBid >= 1 ? placeBid + 1 : 1,
      rejectBid: rejectBid >= 1 ? rejectBid - 1 : 0,
    };
    if (status === "reject") {
      await JobModel.findByIdAndUpdate(jobId, rejectJob, {
        new: true,
      });
      await PerticipationModel.findByIdAndUpdate(id, statusData, {
        new: true,
      });
      res.status(200).json({ message: "Offer rejected" });
    }
    if (status === "progress") {
      await JobModel.findByIdAndUpdate(jobId, progressJob, {
        new: true,
      });
      await PerticipationModel.findByIdAndUpdate(id, statusData, {
        new: true,
      });
      res.status(200).json({ message: "Offer progress" });
    }
  } catch (error) {
    res.status(500).json({ error: error, message: "Update Faild!" });
  }
};

module.exports = {
  getAllPerticipation,
  createPerticipation,
  getAllPerticipationById,
  updatePerticipationStatus,
};

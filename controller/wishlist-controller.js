const WishlistModel = require("../models/wishlist-model");
const JobModel = require("../models/job-model");

// get all wishlist
const getAllWishlist = async (req, res) => {
  try {
    const { page = 1, limit = 20, sellerId } = req.query;
    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const skip = (pageNumber - 1) * limitNumber;
    const filter = {};
    if (sellerId) {
      filter.saverId = sellerId;
    }
    const wishlists = await WishlistModel.find(filter)
      .skip(skip)
      .limit(limitNumber);
    const enrichedWishlists = await Promise.all(
      wishlists.map(async (wishlist) => {
        const existJob = await JobModel.findOne({ _id: wishlist.jobId });
        return {
          ...wishlist.toObject(),
          jobDetails: existJob || null,
        };
      })
    );
    const totalWishlists = await WishlistModel.countDocuments(filter);
    const totalPages = Math.ceil(totalWishlists / limitNumber);
    res.status(200).json({
      currentPage: pageNumber,
      totalPages,
      totalWishlists,
      wishlists: enrichedWishlists,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// get single wishlist
const getsingleWishlist = async (req, res) => {
  const { saverId, jobId } = req.query;
  const filter = {};
  if (saverId && jobId) {
    (filter.saverId = saverId), (filter.jobId = jobId);
  }
  try {
    const exiistWishlist = await WishlistModel.findOne(filter);
    if (exiistWishlist) {
      res.status(200).json(exiistWishlist);
    } else {
      res.status(200).json({});
    }
  } catch (error) {
    res.status(500).json(error);
  }
};

// create wishlist
const createWishlist = async (req, res) => {
  const { saverId, jobId } = req.body;

  const exiistWishlist = await WishlistModel.findOne({
    saverId: saverId,
    jobId: jobId,
  });
  if (exiistWishlist) {
    return res.status(400).json({ message: "You have already saved!" });
  }
  try {
    const wishlistData = new WishlistModel({
      saverId: saverId,
      jobId,
      status: "saved",
    });
    await wishlistData.save();
    res.status(200).json({ wishlistData, message: "Job Saved" });
  } catch (error) {
    res.status(500).json({ error: error, message: "Save Faild!" });
  }
};

// update wishlist status
const updateWishlistStatus = async (req, res) => {
  const id = req.params.id;
  let exiistWishlist = await WishlistModel.findOne({ _id: id });
  const updateData = {
    status: "removed",
  };
  try {
    if (exiistWishlist) {
      await WishlistModel.findByIdAndUpdate(id, updateData, {
        new: true,
      });
      res.status(200).json({ message: "Saved Remove" });
    } else {
      res.status(400).json({ message: "Data Not Found!" });
    }
  } catch (error) {
    res.status(500).json({ message: "Remove Failed!" });
  }
};

// delete wishlist
const deleteWishlist = async (req, res) => {
  const id = req.params.id;
  let exiistWishlist = await WishlistModel.findOne({ _id: id });
  try {
    if (exiistWishlist) {
      await WishlistModel.findByIdAndDelete(id);
      res.status(200).json({ message: "Saved Remove" });
    } else {
      res.status(400).json({ message: "Data Not Found!" });
    }
  } catch (error) {
    res.status(500).json({ message: "Remove Failed!" });
  }
};

module.exports = {
  getAllWishlist,
  getsingleWishlist,
  createWishlist,
  deleteWishlist,
  updateWishlistStatus,
};

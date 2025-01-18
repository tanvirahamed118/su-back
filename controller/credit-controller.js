const CreditModel = require("../models/credit-model");
const SellerModel = require("../models/seller-model");

// get one Credit
const getOneCredit = async (req, res) => {
  const { id } = req.params;
  try {
    const credit = await CreditModel.findOne({ _id: id });
    res.status(200).json(credit);
  } catch (error) {
    res.status(500).json(error);
  }
};

// get all credit
async function getAllCredit(req, res) {
  try {
    const credits = await CreditModel.find();
    res.status(200).json(credits);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// get all Credit
async function getAllCreditByAdmin(req, res) {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const skip = (pageNumber - 1) * limitNumber;
    const filter = {};
    if (status) {
      filter.status = status;
    }

    const credits = await CreditModel.find(filter)
      .skip(skip)
      .limit(limitNumber);
    const totalCredits = await CreditModel.countDocuments(filter);
    const totalPages = Math.ceil(totalCredits / limitNumber);
    res.status(200).json({
      currentPage: pageNumber,
      totalPages,
      totalCredits,
      credits,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// create Credit
const createCredit = async (req, res) => {
  const { title, price, status, credits } = req.body;
  try {
    const createData = new CreditModel({
      title,
      price,
      status,
      credits,
    });
    await createData.save();
    res.status(200).json({ message: "Create successful" });
  } catch (error) {
    res.status(500).json({ error: error, message: "request Faild!" });
  }
};

// cancel Credit
const cancelCredit = async (req, res) => {
  const { id } = req.params;
  const existSeller = await SellerModel.findOne({ _id: id });
  try {
    if (existSeller) {
      const updateSeller = {
        memberShip: {},
        memberShipStatus: "not-available",
        credits: 0,
      };
      await SellerModel.findByIdAndUpdate(id, updateSeller, {
        new: true,
      });
      res.status(200).json({ message: "Credits cancel successful" });
    }
  } catch (error) {
    res.status(500).json({ error: error, message: "request Faild!" });
  }
};

// update Credit
const updateCredit = async (req, res) => {
  const { id } = req.params;
  const { title, price, status, credits } = req.body;
  try {
    const existCredit = await CreditModel.findOne({ _id: id });
    if (existCredit) {
      const updateData = {
        title,
        price,
        status,
        credits,
      };
      await CreditModel.findByIdAndUpdate(id, updateData, {
        new: true,
      });
      res.status(200).json({ message: "Update successful" });
    } else {
      res.status(200).json({ message: "Credits not found!" });
    }
  } catch (error) {
    res.status(500).json(error);
  }
};

// delete Credit
const deleteCredit = async (req, res) => {
  const { id } = req.params;
  const existCredit = await CreditModel.findOne({ _id: id });

  try {
    if (existCredit) {
      await CreditModel.findByIdAndDelete(id);
      res.status(200).json({ message: "Delete successful" });
    } else {
      res.status(200).json({ message: "Credits not found!" });
    }
  } catch (error) {
    res.status(500).json({ error: error, message: "Update Faild!" });
  }
};

module.exports = {
  getOneCredit,
  getAllCredit,
  createCredit,
  updateCredit,
  deleteCredit,
  cancelCredit,
  getAllCreditByAdmin,
};

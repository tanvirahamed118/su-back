const { Wallee } = require("wallee");
const PaymentModel = require("../models/payment-model");
const SellerModel = require("../models/seller-model");
const TransactionModel = require("../models/transaction-model");
const spaceId = process.env.SPACEID;
const apiSecret = process.env.API_SECRET;
const baseURL = process.env.CORS_URL;
const userId = process.env.USER_ID;
let config = {
  space_id: Number(spaceId),
  user_id: Number(userId),
  api_secret: apiSecret,
};

// generate uniqe id
function generateUniqueId() {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substr(2, 9);
  return `${timestamp}-${randomPart}`;
}

// Get all payment
async function getAllPayment(req, res) {
  try {
    const data = await PaymentModel.find();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json(error);
  }
}

// Get Single payment
async function getSinglePayment(req, res) {
  const id = req.params.id;
  const existMessage = await PaymentModel.findOne({ _id: id });
  try {
    if (!existMessage) {
      res.status(400).json({ message: "Transection Not Found" });
    } else {
      res.status(200).json(existMessage);
    }
  } catch (error) {
    res.status(500).json(error);
  }
}

// create membership payment
async function createMembershipPayment(req, res) {
  const { title, _id, currentPrice } = req.body;
  const item = req.body;
  const { id } = req.params;
  const url = `${baseURL}/seller-dashboard/payment-success`;
  try {
    if (item?.plan === "free") {
      const updateMembership = {
        memberShip: item,
        credits: item?.credit,
        memberShipStatus: "complete",
      };

      await SellerModel.findByIdAndUpdate(id, updateMembership, { new: true });
      return res.status(200).json({ pageUrl: url });
    } else {
      let transactionService = new Wallee.api.TransactionService(config);
      let transactionPaymentPageService =
        new Wallee.api.TransactionPaymentPageService(config);
      let lineItem = new Wallee.model.LineItemCreate();
      lineItem.name = title;
      lineItem.uniqueId = generateUniqueId();
      lineItem.sku = _id;
      lineItem.quantity = 1;
      lineItem.amountIncludingTax = currentPrice;
      lineItem.type = Wallee.model.LineItemType.PRODUCT;
      let transaction = new Wallee.model.TransactionCreate();
      transaction.lineItems = [lineItem];
      transaction.autoConfirmationEnabled = true;
      transaction.currency = "CHF";
      transaction.failedUrl = `${baseURL}/seller-dashboard/payment-fail`;
      transaction.successUrl = `${baseURL}/seller-dashboard/payment-success`;

      const transactionResponse = await transactionService.create(
        spaceId,
        transaction
      );
      let transactionCreate = transactionResponse.body;

      const paymentPageResponse =
        await transactionPaymentPageService.paymentPageUrl(
          spaceId,
          transactionCreate.id
        );
      await TransactionModel.create({
        transactionId: transactionCreate.id,
        sellerId: id,
        memberShip: item,
        cost: currentPrice,
        status: "pending",
      });
      const membershipComplete = {
        memberShip: item,
      };
      await SellerModel.findByIdAndUpdate(id, membershipComplete, {
        new: true,
      });

      let pageUrl = paymentPageResponse.body;
      return res.status(200).json({ pageUrl: pageUrl });
    }
  } catch (error) {
    return res.status(500).json(error);
  }
}

// create credit payment
async function createCreditsPayment(req, res) {
  const { id, credit, price, sellerId } = req.body;
  const item = req.body;
  const existSeller = await SellerModel.findOne({ _id: sellerId });

  if (!existSeller.memberShip) {
    return res
      .status(400)
      .json({ message: "You are not eligible to purchase credit!" });
  }
  try {
    let transactionService = new Wallee.api.TransactionService(config);
    let transactionPaymentPageService =
      new Wallee.api.TransactionPaymentPageService(config);
    let lineItem = new Wallee.model.LineItemCreate();
    lineItem.name = `${credit} credit`;
    lineItem.uniqueId = generateUniqueId();
    lineItem.sku = id;
    lineItem.quantity = 1;
    lineItem.amountIncludingTax = price;
    lineItem.type = Wallee.model.LineItemType.PRODUCT;

    let transaction = new Wallee.model.TransactionCreate();
    transaction.lineItems = [lineItem];
    transaction.autoConfirmationEnabled = true;
    transaction.currency = "CHF";
    transaction.failedUrl = `${baseURL}/seller-dashboard/seller-credit/payment-fail`;
    transaction.successUrl = `${baseURL}/seller-dashboard/seller-credit/payment-success`;

    // Create the transaction
    const transactionResponse = await transactionService.create(
      spaceId,
      transaction
    );
    let transactionCreate = transactionResponse.body;

    // Get the payment page URL
    const paymentPageResponse =
      await transactionPaymentPageService.paymentPageUrl(
        spaceId,
        transactionCreate.id
      );
    await TransactionModel.create({
      transactionId: transactionCreate.id,
      sellerId: sellerId,
      credits: item,
      cost: price,
      status: "pending",
    });
    const updateSeller = {
      pendingCredits: credit,
    };

    await SellerModel.findByIdAndUpdate(sellerId, updateSeller, { new: true });
    let pageUrl = paymentPageResponse.body;

    return res.status(200).json({ pageUrl: pageUrl });
  } catch (error) {
    return res
      .status(500)
      .json({ error: error.message || "An error occurred" });
  }
}

async function updatePaymentMembershipStatus(req, res) {
  const { credit, sellerId, status } = req.body;
  const existSeller = await SellerModel.findOne({ _id: sellerId });
  try {
    if (existSeller) {
      const updateData = {
        memberShipStatus: status,
        credits: credit,
      };
      await SellerModel.findByIdAndUpdate(sellerId, updateData, { new: true });
      res.status(200).json({ message: "Update Successful" });
    }
  } catch (error) {
    res.status(500).json(error);
  }
}

async function updatePaymentCredit(req, res) {
  const { credit, sellerId } = req.body;
  const existSeller = await SellerModel.findOne({ _id: sellerId });
  try {
    if (existSeller) {
      const updateData = {
        credits: existSeller?.credits + credit,
        pendingCredits: 0,
      };
      await SellerModel.findByIdAndUpdate(sellerId, updateData, { new: true });
      res.status(200).json({ message: "Update Successful" });
    }
  } catch (error) {
    res.status(500).json(error);
  }
}

// Delete payment
async function deletePayment(req, res) {
  const id = req.params.id;
  let existMessage = await PaymentModel.findOne({ _id: id });
  try {
    if (existMessage) {
      await PaymentModel.findOneAndDelete(id);
      res.status(200).json({ message: "Transection Deleted!" });
    } else {
      res.status(400).json({ message: "Transection Does Not Exist" });
    }
  } catch (error) {
    res.status(500).json({ message: "Transection Delete Failed!" });
  }
}

// get all transaction
async function getAllTransactions(req, res) {
  try {
    let existtransac = await TransactionModel.find();
    res.status(200).json(existtransac);
  } catch (error) {
    res.status(500).json(error);
  }
}

module.exports = {
  createMembershipPayment,
  getAllPayment,
  getSinglePayment,
  deletePayment,
  createCreditsPayment,
  updatePaymentMembershipStatus,
  getAllTransactions,
  updatePaymentCredit,
};

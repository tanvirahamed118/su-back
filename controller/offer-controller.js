const OfferModel = require("../models/offer-model");
const JobModel = require("../models/job-model");
const ProposalModel = require("../models/proposal-model");
const SellerModel = require("../models/seller-model");
const ClientModel = require("../models/client-model");
const CommunicationModel = require("../models/communication-model");
const nodemailer = require("nodemailer");
const Mailgen = require("mailgen");
const EMAIL = process.env.EMAIL;
const PASSWORD = process.env.PASSWORD;

// get all Offer
const getOneOffer = async (req, res) => {
  const { id } = req.params;
  try {
    const Offer = await OfferModel.findOne({ perticipationId: id });
    res.status(200).json(Offer);
  } catch (error) {
    res.status(500).json(error);
  }
};

// get all Offer default
const getAllOfferDefault = async (req, res) => {
  try {
    const Offer = await OfferModel.find();
    res.status(200).json(Offer);
  } catch (error) {
    res.status(500).json(error);
  }
};

// get all offer
async function getAllOffer(req, res) {
  try {
    const { page = 1, limit = 20, id = "", sellerId = "" } = req.query;
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    const skip = (pageNumber - 1) * limitNumber;
    const filter = {};

    if (sellerId) {
      filter.sellerId = sellerId;
    } else if (id) {
      filter.jobId = id;
    }
    const offers = await OfferModel.find(filter).skip(skip).limit(limitNumber);
    const totalOffers = await OfferModel.countDocuments(filter);
    const totalPages = Math.ceil(totalOffers / limitNumber);
    res.status(200).json({
      currentPage: pageNumber,
      totalPages,
      totalOffers,
      offers: offers,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// create Offer
const createOffer = async (req, res) => {
  const { jobId, sellerId, clientId, message, perticipationId } = req.body;
  const existSeller = await SellerModel.findOne({ _id: sellerId });
  const existClient = await ClientModel.findOne({ _id: clientId });
  const id = sellerId;
  try {
    const existOffer = await OfferModel.findOne({
      perticipationId: perticipationId,
    });
    const existJob = await JobModel.findOne({
      _id: jobId,
    });
    const existProposal = await ProposalModel.findOne({
      jobId: jobId,
      sellerId: sellerId,
    });

    if (existProposal) {
      return res.status(400).json({ message: "Already have a proposal" });
    }
    if (existOffer) {
      return res.status(400).json({ message: "Already send a request" });
    }
    if (existSeller.credits < 2) {
      return res
        .status(400)
        .json({ message: "Seller does not have enough credits" });
    }
    const existCommunication = await CommunicationModel.findOne({
      jobId: jobId,
      sellerId: sellerId,
    });
    if (existCommunication) {
      let updateCommunication = { $push: {} }; // Initialize $push as an object
      updateCommunication.$push.clientMessage = {
        message: `We will ask you to make a proposal request and send your best offer. We will check it shortly.\n ${
          message &&
          `<p style="font-weight: bold; color: #777; font-size: 18px">Message: </p>${message}`
        }`,
        date: new Date(),
        time: new Date().getTime(),
      };

      await sendEmailNotification(
        existSeller.username,
        existSeller.email,
        `You have received a new message from ${existClient?.username}`,
        `Client Name: ${existClient?.username} <br> Client Phone Number: ${
          existClient?.phone
        }<br> Client Email: ${existClient?.email} <br> ${
          message && `message: ${message}`
        }`,
        existClient?.username
      );
      await CommunicationModel.findByIdAndUpdate(
        existCommunication?._id,
        updateCommunication,
        { new: true }
      );
    }
    const OfferData = new OfferModel({
      jobId,
      sellerId,
      clientId,
      message,
      perticipationId,
      jobTitle: existJob?.jobTitle,
    });
    const updateData = {
      credits: existSeller.credits ? existSeller.credits - 2 : 0,
    };
    await SellerModel.findByIdAndUpdate(id, updateData, { new: true });
    await OfferData.save();
    res.status(200).json({ message: "Request send" });
  } catch (error) {
    res.status(500).json({ error: error, message: "request Faild!" });
  }
};

// send email when send offer
async function sendEmailNotification(
  name,
  email,
  subject,
  message,
  receiveName
) {
  const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: EMAIL,
      pass: PASSWORD,
    },
  });

  const mailGenerator = new Mailgen({
    theme: "default",
    product: {
      name: "Suisse-Offerten GmbH",
      link: "https://suisseoffertengmbh.com", // Your company's website
    },
  });

  const emailTemplate = {
    body: {
      name: `${name}`, // Recipient's name
      intro: `You have received a new message from ${receiveName}:`, // Introduction
      outro: `
        <div style="border-top: 1px solid #ddd; margin: 20px 0; padding-top: 10px;">
          <strong style="font-size: 16px;">Message:</strong>
          <p style="font-size: 14px; color: #555;">${message}</p>
        </div>
        <p style="font-size: 14px; color: #777;">Please login to your account to reply to this message.</p>
        <p style="font-size: 14px; color: #777; margin-top: 20px;">Suisse-Offerten GmbH</p>
        <p style="font-size: 14px; color: #4285F4;">Suisse-Offerten GmbH Team</p>
        <p style="font-size: 14px; color: #4285F4;">www.suisseoffertenGmbH.com</p>
        <p style="font-size: 14px; color: #777;">Tel: 04444444</p>
      `, // Styled outro message
    },
  };

  // Manually inject the message as a key and value
  emailTemplate.body.message = `${message}`;

  const emailBody = mailGenerator.generate(emailTemplate);

  const mailOptions = {
    from: EMAIL, // Sender's email address
    to: email, // Recipient's email address
    subject: subject, // Email subject
    html: emailBody, // HTML content for the email
  };

  // Send the email
  await transporter.sendMail(mailOptions);
}

// update offer status
const updateOfferStatus = async (req, res) => {
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
      await OfferModel.findByIdAndUpdate(id, statusData, {
        new: true,
      });
      res.status(200).json({ message: "Offer rejected" });
    }
    if (status === "progress") {
      await JobModel.findByIdAndUpdate(jobId, progressJob, {
        new: true,
      });
      await OfferModel.findByIdAndUpdate(id, statusData, {
        new: true,
      });
      res.status(200).json({ message: "Offer progress" });
    }
  } catch (error) {
    res.status(500).json({ error: error, message: "Update Faild!" });
  }
};

module.exports = {
  getAllOffer,
  createOffer,
  getOneOffer,
  updateOfferStatus,
  getAllOfferDefault,
};

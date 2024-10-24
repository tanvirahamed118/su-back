const ProposalModel = require("../models/proposal-model");
const JobModel = require("../models/job-model");
const ClientModel = require("../models/client-model");
const OfferModel = require("../models/offer-model");
const SellerModel = require("../models/seller-model");
const CommunicationModel = require("../models/communication-model");
const PerticipationModel = require("../models/perticipation-model");
const nodemailer = require("nodemailer");
const Mailgen = require("mailgen");
const EMAIL = process.env.EMAIL;
const PASSWORD = process.env.PASSWORD;
const supportMail = process.env.SUPPORT_MAIL;
const supportPhone = process.env.SUPPORT_PHONE;
const corsUrl = process.env.CORS_URL;

// get all Proposal
const getAllProposal = async (req, res) => {
  try {
    const { page = 1, limit = 20, clientId = "", sellerId = "" } = req.query;
    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const skip = (pageNumber - 1) * limitNumber;

    const filter = clientId
      ? {
          clientId,
        }
      : sellerId
      ? {
          sellerId,
        }
      : {};

    const proposals = await ProposalModel.find(filter)
      .skip(skip)
      .limit(limitNumber);
    const totalProposal = await ProposalModel.countDocuments(filter);
    const totalPages = Math.ceil(totalProposal / limitNumber);
    res.status(200).json({
      currentPage: pageNumber,
      totalPages,
      totalProposal,
      proposals,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// get all proposals by admin
async function getAllProposalsByAdmin(req, res) {
  try {
    const { page = 1, limit = 20, status = "" } = req.query;
    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const skip = (pageNumber - 1) * limitNumber;
    const filter = {};

    if (status) {
      filter.status = status;
    }

    const proposals = await ProposalModel.find(filter)
      .skip(skip)
      .limit(limitNumber);
    const totalProposals = await ProposalModel.countDocuments(filter);
    const totalPages = Math.ceil(totalProposals / limitNumber);

    res.status(200).json({
      currentPage: pageNumber,
      totalPages,
      totalProposals,
      proposals,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// get single Proposal
const getSingleProposal = async (req, res) => {
  const id = req.params.id;
  try {
    const existProposal = await ProposalModel.findOne({ _id: id });
    if (existProposal) {
      res.status(200).json(existProposal);
    } else {
      res.status(400).json({ message: "Data Not Found!" });
    }
  } catch (error) {
    res.status(500).json(error);
  }
};

// get all Proposal default
const getAllProposalDefault = async (req, res) => {
  try {
    const existProposal = await ProposalModel.find();
    res.status(200).json(existProposal);
  } catch (error) {
    res.status(500).json(error);
  }
};

// get single Proposal
const getSingleProposalByClient = async (req, res) => {
  const { sellerId, jobId } = req.params;
  try {
    const existProposal = await ProposalModel.findOne({
      sellerId: sellerId,
      jobId: jobId,
    });
    if (existProposal) {
      res.status(200).json(existProposal);
    } else {
      res.status(400).json({ message: "Data Not Found!" });
    }
  } catch (error) {
    res.status(500).json(error);
  }
};

// create Proposal
const createProposal = async (req, res) => {
  const {
    priceUnit,
    offerPrice,
    offerNote,
    jobId,
    sellerId,
    sellerName,
    sellerPhone,
  } = req.body;
  let file;
  const existJob = await JobModel.findOne({ _id: jobId });
  const updateJob = {
    offerRequest: existJob?.offerRequest ? existJob?.offerRequest + 1 : 1,
  };

  const existCommunication = await CommunicationModel.findOne({
    jobId: jobId,
    sellerId: sellerId,
  });
  const existOffer = await OfferModel.findOne({
    sellerId: sellerId,
    jobId: jobId,
  });

  const existClient = await ClientModel.findOne({
    _id: existCommunication.clientId,
  });

  if (existCommunication) {
    let updateData = { $push: {} };
    updateData.$push.sellerMessage = {
      message: `price unit: ${priceUnit}\n offer price: ${offerPrice}\n offer note: ${offerNote}${
        req.file
          ? `\n offer file: <br> <a style="color: #777; font-weight: bold;" href="${req.file.location}" download>Download offer file</a>`
          : ""
      }`,
      date: new Date(),
      time: new Date().getTime(),
    };

    await sendEmailNotification(
      existClient.username,
      existClient.email,
      `You have received a new message from ${sellerName}`,
      `price unit: ${priceUnit}<br> offer price: ${offerPrice} <br> offer note: ${offerNote}`,
      sellerName
    );
    await CommunicationModel.findByIdAndUpdate(
      existCommunication?._id,
      updateData,
      { new: true }
    );
  }
  if (!existOffer) {
    return res
      .status(400)
      .json({ message: "You are not eligible to send proposal!" });
  }
  const existProposal = await ProposalModel.findOne({
    sellerId: sellerId,
    jobId: jobId,
  });

  if (existProposal) {
    return res.status(400).json({ message: "You have already send proposal!" });
  }
  try {
    if (existOffer) {
      if (req.file) {
        file = req.file.location;
      }
      if (existOffer) {
        await OfferModel.findByIdAndDelete(existOffer?._id);
      }

      const proposalData = new ProposalModel({
        priceUnit,
        offerPrice,
        offerNote,
        jobId,
        sellerId,
        clientId: existOffer.clientId,
        clientName: existClient?.username,
        clientPhone: existClient?.phone,
        sellerName,
        offerFiles: file,
        sellerPhone,
        jobTitle: existJob?.jobTitle,
        jobLocation: existJob?.jobLocation + " " + `(${existJob?.jobPostcode})`,
        jobNumber: existJob?.jobNumber,
        compititor: existJob?.placeBid,
        view: "unseen",
      });
      await proposalData.save();
      await JobModel.findByIdAndUpdate(jobId, updateJob, {
        new: true,
      });
      res.status(201).json({ message: "Proposal Submit Successful" });
    }
  } catch (error) {
    res.status(500).json({ error: error, message: "Send Failed!" });
  }
};

// update Proposal
const updateProposal = async (req, res) => {
  const { priceUnit, offerPrice, offerNote } = req.body;
  const { id } = req.params;
  const existProposal = await ProposalModel.findOne({
    _id: id,
  });
  try {
    if (existProposal) {
      let file;

      if (req.file) {
        file = req.file.location;
      }
      const updateData = {
        priceUnit,
        offerPrice,
        offerNote,
        offerFiles: file,
      };

      await ProposalModel.findByIdAndUpdate(id, updateData, { new: true });
      res.status(200).json({ message: "Update Successful" });
    }
  } catch (error) {
    res.status(500).json({ error: error, message: "Update Failed!" });
  }
};

// update Proposal status
const updateProposalStatusByClient = async (req, res) => {
  const { status, sellerId, jobId } = req.body;

  try {
    let existProposal = await ProposalModel.findOne({
      sellerId: sellerId,
      jobId: jobId,
    });
    let existPerticipation = await PerticipationModel.findOne({
      sellerId: sellerId,
      jobId: jobId,
    });
    const id = existPerticipation?._id;
    const existCommunication = await CommunicationModel.findOne({
      jobId: existProposal?.jobId,
    });
    const existSeller = await SellerModel.findOne({
      _id: existCommunication?.sellerId,
    });
    const existClient = await ClientModel.findOne({
      _id: existCommunication?.clientId,
    });
    if (existProposal?.status === "archived") {
      return res.status(400).json({ message: "Proposal already archived" });
    }

    if (existCommunication) {
      if (status === "accept") {
        const updatePerticipation = {
          status: "close",
        };
        await PerticipationModel.findByIdAndUpdate(id, updatePerticipation, {
          new: true,
        });
        let updateData = { $push: {} }; // Initialize $push as an object
        updateData.$push.clientMessage = {
          message: `GOOD NEWS, your proposal is accepted.`,
          date: new Date(),
          time: new Date().getTime(),
        };

        await sendEmailNotification(
          existSeller.username,
          existSeller.email,
          `You have received a new message from ${existClient?.username}`,
          `GOOD NEWS, Your Proposal is accepted.`,
          existClient?.username
        );
        await CommunicationModel.findByIdAndUpdate(
          existCommunication?._id,
          updateData,
          { new: true }
        );
      }
      if (status === "rejected") {
        const updatePerticipation = {
          status: "close",
        };
        await PerticipationModel.findByIdAndUpdate(id, updatePerticipation, {
          new: true,
        });
        let updateData = { $push: {} }; // Initialize $push as an object
        updateData.$push.clientMessage = {
          message: `We are sorry to say, we do not accept your proposal.`,
          date: new Date(),
          time: new Date().getTime(),
        };

        await sendEmailNotification(
          existSeller.username,
          existSeller.email,
          `You have received a new message from ${existClient?.username}`,
          `We are sorry to say, client reject your proposal.`,
          existClient?.username
        );
        await CommunicationModel.findByIdAndUpdate(
          existCommunication?._id,
          updateData,
          { new: true }
        );
      }
    }

    if (existProposal) {
      let updateData = {
        status: status,
      };
      if (status === "accept") {
        const updateJob = {
          status: "close",
        };
        await JobModel.findByIdAndUpdate(existProposal?.jobId, updateJob, {
          new: true,
        });
      }

      await ProposalModel.findByIdAndUpdate(existProposal?._id, updateData, {
        new: true,
      });
      res.status(200).json({ message: `Proposal ${status}` });
    } else {
      res.status(400).json("Data Not Found!");
    }
  } catch (error) {
    res.status(500).json(error);
  }
};

// update Proposal status
const updateProposalStatusBySeller = async (req, res) => {
  const { status, id } = req.body;

  try {
    let existProposal = await ProposalModel.findOne({ _id: id });
    const existCommunication = await CommunicationModel.findOne({
      jobId: existProposal?.jobId,
    });
    const existSeller = await SellerModel.findOne({
      _id: existCommunication?.sellerId,
    });
    const existClient = await ClientModel.findOne({
      _id: existCommunication?.clientId,
    });
    if (existCommunication) {
      let updateData = { $push: {} }; // Initialize $push as an object
      updateData.$push.sellerMessage = {
        message: `${existSeller.username} archived his proposal.`,
        date: new Date(),
        time: new Date().getTime(),
      };

      await sendEmailNotification(
        existClient.username,
        existClient.email,
        `You have received a new message from ${existSeller?.username}`,
        `Proposal archived by seller, you can not perform it anymore. Contact the seller`,
        existSeller?.username
      );
      await CommunicationModel.findByIdAndUpdate(
        existCommunication?._id,
        updateData,
        { new: true }
      );
    }
    if (existProposal?.status === "archived") {
      return res.status(400).json({ message: "Proposal already archived" });
    }
    if (existProposal) {
      let updateData = {
        status: status,
      };
      if (status === "accept") {
        const updateJob = {
          status: "close",
        };
        await JobModel.findByIdAndUpdate(existProposal?.jobId, updateJob, {
          new: true,
        });
      }
      await ProposalModel.findByIdAndUpdate(id, updateData, { new: true });
      res.status(200).json({ message: `Proposal ${status}` });
    } else {
      res.status(400).json("Data Not Found!");
    }
  } catch (error) {
    res.status(500).json(error);
  }
};

// send email when proposal create and update
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
      name: "Suisse-Offerten",
      link: "http://suisse-offerten.ch/",
    },
  });
  const emailTemplate = {
    body: {
      name: `${name}`,
      intro: `You have received a new message from ${receiveName}:`,
      outro: `
        <div style="border-top: 1px solid #ddd; margin: 20px 0; padding-top: 10px;">
          <strong style="font-size: 16px;">Message:</strong>
          <p style="font-size: 14px; color: #555;">${message}</p>
        </div>
        <p style="font-size: 14px; color: #777;">Please login to your account to reply to this message.</p>
        <p style="font-size: 14px; color: #777; margin-top: 20px;">Suisse-Offerten</p>
        <p style="font-size: 14px; color: #4285F4;"><a href="${corsUrl}">Suisse-Offerten</a></p>
        <p style="font-size: 14px; color: #4285F4;">E-mail: ${supportMail}</p>
        <p style="font-size: 14px; color: #777;">Tel: ${supportPhone}</p>
      `,
    },
  };
  emailTemplate.body.message = `${message}`;
  const emailBody = mailGenerator.generate(emailTemplate);
  const mailOptions = {
    from: EMAIL,
    to: email,
    subject: subject,
    html: emailBody,
  };
  await transporter.sendMail(mailOptions);
}

// proposal review request send
const proposalReviewRequest = async (req, res) => {
  const { id } = req.params;
  try {
    let existProposal = await ProposalModel.findOne({ _id: id });
    if (existProposal.status === "accept") {
      let updateData = {
        reviewRequest: true,
        requestView: "unseen",
      };
      await ProposalModel.findByIdAndUpdate(id, updateData, { new: true });
      res.status(200).json({ message: "Review request send" });
    } else {
      res.status(400).json("Data not found!");
    }
  } catch (error) {
    res.status(500).json(error);
  }
};

// update proposal view
const updateProposalView = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) {
      return res.status(400).json({ message: "Invalid ID" });
    }
    const existProposal = await ProposalModel.findOne({ _id: id });
    if (existProposal) {
      const updateView = {
        view: "seen",
      };
      await ProposalModel.findByIdAndUpdate(id, updateView, { new: true });
      return res.status(200).json({ message: "Update Successful" });
    } else {
      return res.status(404).json({ message: "Data Not Found!" });
    }
  } catch (error) {
    return res.status(500).json(error);
  }
};

// delete Proposal
const deleteProposal = async (req, res) => {
  const id = req.params.id;
  let existProposal = await ProposalModel.findOne({ _id: id });
  try {
    if (existProposal) {
      await ProposalModel.findByIdAndDelete(id);
      res.status(200).json({ message: "Delete Successful" });
    } else {
      res.status(400).json({ message: "Data Not Found!" });
    }
  } catch (error) {
    res.status(500).json({ message: "Delete Failed!" });
  }
};

module.exports = {
  getAllProposal,
  getSingleProposal,
  createProposal,
  updateProposalStatusByClient,
  updateProposalStatusBySeller,
  updateProposalView,
  deleteProposal,
  updateProposal,
  getSingleProposalByClient,
  proposalReviewRequest,
  getAllProposalsByAdmin,
  getAllProposalDefault,
};

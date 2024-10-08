const CommunicationModel = require("../models/communication-model");
const SellerModel = require("../models/seller-model");
const PerticipationModel = require("../models/perticipation-model");
const ClientModel = require("../models/client-model");
const JobModel = require("../models/job-model");
const nodemailer = require("nodemailer");
const Mailgen = require("mailgen");
const EMAIL = process.env.EMAIL;
const PASSWORD = process.env.PASSWORD;

// get all communication
const getAllCommunication = async (req, res) => {
  try {
    const communication = await CommunicationModel.find();
    res.status(200).json(communication);
  } catch (error) {
    res.status(500).json(error);
  }
};

// get all communication
const getAllCommunicationByClient = async (req, res) => {
  const { id } = req.query;
  const filter = {
    clientId: id,
  };
  try {
    const communication = await CommunicationModel.find(filter);
    res.status(200).json(communication);
  } catch (error) {
    res.status(500).json(error);
  }
};

// get user communication
const getUserCommunication = async (req, res) => {
  try {
    const existCommunication = await CommunicationModel.find({
      jobId: req.params.id,
    });
    if (existCommunication) {
      res.status(200).json(existCommunication);
    } else {
      res.status(400).json("Data Not Found!");
    }
  } catch (error) {
    res.status(500).json(error);
  }
};

// get single communication
const getsingleCommunication = async (req, res) => {
  const id = req.params.id;
  try {
    const existCommunication = await CommunicationModel.findOne({ _id: id });
    if (existCommunication) {
      res.status(200).json(existCommunication);
    } else {
      res.status(400).json({ message: "Data Not Found!" });
    }
  } catch (error) {
    res.status(500).json(error);
  }
};

// create communication
const createCommunication = async (req, res) => {
  const { clientId, sellerMessage, jobId, sellerId, clientMessage } = req.body;
  const existSeller = await SellerModel.findOne({ _id: sellerId });
  const existClient = await ClientModel.findOne({ _id: clientId });
  const collectios = await CommunicationModel.find({ jobId: jobId });
  if (collectios.length >= 5) {
    return res.status(400).json({ message: "Bidding are not available!" });
  }
  const existJob = await JobModel.findOne({ _id: jobId });
  const existSellerCom = await CommunicationModel.findOne({
    sellerId: sellerId,
    jobId: jobId,
  });
  if (existSellerCom) {
    return res.status(400).json({ message: "You have already send message!" });
  }
  try {
    if (existSeller) {
      const reviewData = new CommunicationModel({
        clientId,
        jobId,
        sellerId,
        view: "unseen",
        sellerMessage: sellerMessage
          ? [
              {
                message: sellerMessage,
                date: new Date(),
                time: new Date().getTime(),
              },
            ]
          : [],
        clientMessage: clientMessage
          ? [
              {
                message: clientMessage,
                date: new Date(),
                time: new Date().getTime(),
              },
            ]
          : [],
      });

      const PerticipationData = new PerticipationModel({
        sellerId: existSeller?._id,
        jobId: jobId,
        clientId: clientId,
        message: sellerMessage,
      });
      const bid = existJob.placeBid > 0 ? existJob.placeBid + 1 : 1;
      const updateJob = {
        placeBid: bid,
      };
      if (sellerMessage) {
        // Seller sent a message, send email to client
        if (existClient) {
          await sendEmailNotification(
            existClient.username,
            existClient.email,
            `You have received a new message from ${existSeller.username}`,
            sellerMessage,
            existSeller.username
          );
        }
      } else if (clientMessage) {
        // Client sent a message, send email to seller
        if (existSeller) {
          await sendEmailNotification(
            existSeller.username,
            existSeller.email,
            `You have received a new message from ${existClient.username}`,
            clientMessage,
            existClient.username
          );
        }
      }

      await JobModel.findByIdAndUpdate(jobId, updateJob, { new: true });
      await PerticipationData.save();
      await reviewData.save();
      res.status(201).json({ message: "Message Sent" });
    }
  } catch (error) {
    res.status(500).json({ error: error, message: "Send Failed!" });
  }
};

// update communication view
const updateCommunicationView = async (req, res) => {
  try {
    const { id, jobId } = req.body;
    const filter = {
      jobId: jobId,
      clientId: id,
    };
    const updateView = {
      view: "seen",
    };
    await CommunicationModel.updateMany(filter, updateView);
    res.status(200).json({
      message: "communications marked as seen.",
    });
  } catch (error) {
    res.status(500).json(error);
  }
};

// update communication
const updateCommunication = async (req, res) => {
  const id = req.params.id;
  const { sellerMessage, clientMessage } = req.body;

  try {
    let existCommunication = await CommunicationModel.findById(id);
    const sellerId = existCommunication?.sellerId;
    const clientId = existCommunication?.clientId;
    const existSeller = await SellerModel.findOne({ _id: sellerId });
    const existClient = await ClientModel.findOne({ _id: clientId });
    if (sellerMessage) {
      // Seller sent a message, send email to client
      if (existClient) {
        await sendEmailNotification(
          existClient.username,
          existClient.email,
          `You have received a new message from ${existSeller.username}`,
          sellerMessage,
          existSeller.username
        );
      }
    } else if (clientMessage) {
      // Client sent a message, send email to seller
      if (existSeller) {
        await sendEmailNotification(
          existSeller.username,
          existSeller.email,
          `You have received a new message from ${existClient.username}`,
          clientMessage,
          existClient.username
        );
      }
    }
    if (existCommunication) {
      let updateData = {};
      if (sellerMessage) {
        if (!updateData.$push) {
          updateData.$push = {};
        }

        updateData.$push.sellerMessage = {
          message: sellerMessage,
          date: new Date(),
          time: new Date().getTime(),
        };
      }
      if (clientMessage) {
        if (!updateData.$push) {
          updateData.$push = {};
        }

        updateData.$push.clientMessage = {
          message: clientMessage,
          date: new Date(),
          time: new Date().getTime(),
        };
      }
      await CommunicationModel.findByIdAndUpdate(id, updateData, { new: true });
      res.status(200).json({ message: "Message send" });
    } else {
      res.status(400).json({ message: "Data Not Found!" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Send email notification
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

// delete communication
const deleteCommunication = async (req, res) => {
  const id = req.params.id;
  let existCommunication = await CommunicationModel.findOne({ _id: id });
  try {
    if (existCommunication) {
      await CommunicationModel.findByIdAndDelete(id);
      res.status(200).json({ message: "Delete Successful" });
    } else {
      res.status(400).json({ message: "Data Not Found!" });
    }
  } catch (error) {
    res.status(500).json({ message: "Delete Failed!" });
  }
};

module.exports = {
  getAllCommunication,
  getUserCommunication,
  getsingleCommunication,
  createCommunication,
  updateCommunication,
  deleteCommunication,
  getAllCommunicationByClient,
  updateCommunicationView,
};

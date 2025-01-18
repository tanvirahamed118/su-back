const ContactModel = require("../models/contact-model");
const SellerModel = require("../models/seller-model");
const ClientModel = require("../models/client-model");
const EMAIL = process.env.EMAIL;
const PASSWORD = process.env.PASSWORD;
const nodemailer = require("nodemailer");
const Mailgen = require("mailgen");
const supportMail = process.env.SUPPORT_MAIL;
const supportPhone = process.env.SUPPORT_PHONE;
const corsUrl = process.env.CORS_URL;

// Get All contact
async function getAllContact(req, res) {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const skip = (pageNumber - 1) * limitNumber;
    const filter = {};
    if (status) {
      filter.status = status;
    }
    const emails = await ContactModel.find(filter)
      .skip(skip)
      .limit(limitNumber);
    const totalEmails = await ContactModel.countDocuments(filter);
    const totalPages = Math.ceil(totalEmails / limitNumber);
    res.status(200).json({
      currentPage: pageNumber,
      totalPages,
      totalEmails,
      emails,
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error!", error });
  }
}

// Get All seller emails
async function getAllSellerEmails(req, res) {
  try {
    const { page = 1, limit = 20, location, activitie } = req.query;
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    const skip = (pageNumber - 1) * limitNumber;

    const filter = {};
    if (location && location.trim()) {
      filter.activities = { $in: [location] };
    }
    if (activitie && activitie.trim()) {
      filter.preference = { $in: [activitie] };
    }

    const emails = await SellerModel.find(filter).skip(skip).limit(limitNumber);
    const totalEmails = await SellerModel.countDocuments(filter);
    const totalPages = Math.ceil(totalEmails / limitNumber);

    res.status(200).json({
      currentPage: pageNumber,
      totalPages,
      totalEmails,
      emails,
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error!", error });
  }
}

// Get All client emails
async function getAllClientEmails(req, res) {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    const skip = (pageNumber - 1) * limitNumber;
    const emails = await ClientModel.find().skip(skip).limit(limitNumber);
    const totalEmails = await ClientModel.countDocuments();
    const totalPages = Math.ceil(totalEmails / limitNumber);
    res.status(200).json({
      currentPage: pageNumber,
      totalPages,
      totalEmails,
      emails,
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error!", error });
  }
}

// Get All contact by default
async function getAllContactDefault(req, res) {
  try {
    const emails = await ContactModel.find();
    res.status(200).json(emails);
  } catch (error) {
    res.status(500).json({ message: "Server Error!", error });
  }
}

// Get Single contact
async function getSingleContact(req, res) {
  const id = req.params.id;
  const existMessage = await ContactModel.findOne({ _id: id });
  try {
    if (!existMessage) {
      res.status(400).json({ message: "Message Not Found" });
    } else {
      res.status(200).json(existMessage);
    }
  } catch (error) {
    res.status(500).json({ message: "Server Error!", error });
  }
}

// Create contact
async function createContact(req, res) {
  const { notice, name, email, phone, service, role } = req.body;
  try {
    const newMessage = new ContactModel({
      notice,
      name,
      email,
      phone,
      service,
      role,
      status: "unread",
    });
    let config = {
      service: "gmail",
      auth: {
        user: EMAIL,
        pass: PASSWORD,
      },
    };
    let transport = nodemailer.createTransport(config);
    let mailGenarator = new Mailgen({
      theme: "default",
      product: {
        name: "Suiess-offerten",
        link: "https://suisse-offerten.ch/",
      },
    });

    let response = {
      body: {
        name: "Cheaf",
        intro: `Message from ${email}`,
        outro: `
        <div style="border-top: 1px solid #ddd; margin: 20px 0; padding-top: 10px;">
          <strong style="font-size: 16px;">Request Creator Name:</strong>
          <p style="font-size: 14px; color: #555;">${name}</p>
        </div>
        <div style="border-top: 1px solid #ddd; margin: 20px 0; padding-top: 10px;">
          <strong style="font-size: 16px;">Request Creator Email:</strong>
          <p style="font-size: 14px; color: #555;">${email}</p>
        </div>
        <div style="border-top: 1px solid #ddd; margin: 20px 0; padding-top: 10px;">
          <strong style="font-size: 16px;">Request Creator Role:</strong>
          <p style="font-size: 14px; color: #555;">${role}</p>
        </div>
        <div style="border-top: 1px solid #ddd; margin: 20px 0; padding-top: 10px;">
          <strong style="font-size: 16px;">Request Phone Number:</strong>
          <p style="font-size: 14px; color: #555;">${phone}</p>
        </div>
        <div style="border-top: 1px solid #ddd; margin: 20px 0; padding-top: 10px;">
          <strong style="font-size: 16px;">Service Area:</strong>
          <p style="font-size: 14px; color: #555;">${service}</p>
        </div>
        <div style="border-top: 1px solid #ddd; margin: 20px 0; padding-top: 10px;">
          <strong style="font-size: 16px;">Request Creator Notice:</strong>
          <p style="font-size: 14px; color: #555;">${notice}</p>
        </div>
        <p style="font-size: 14px; color: #777; margin-top: 20px;">Suisse-Offerten</p>
        <p style="font-size: 14px; color: #4285F4;"><a href="${corsUrl}">Suisse-Offerten</a></p>
        <p style="font-size: 14px; color: #4285F4;">E-mail: ${supportMail}</p>
        <p style="font-size: 14px; color: #777;">Tel: ${supportPhone}</p>
      `,
      },
    };
    let mail = await mailGenarator.generate(response);
    let message = {
      from: email,
      to: EMAIL,
      subject: "You have received a message from contact us page",
      html: mail,
    };

    await newMessage.save();
    transport.sendMail(message).then(() => {
      return res.status(201).json({ newMessage, message: "Message Send" });
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error!", error });
  }
}

// Update contact
async function updateContact(req, res) {
  const id = req.params.id;
  const { notice, name, email, phone, service, role } = req.body;
  const existMessage = await ContactModel.findOne({ _id: id });
  try {
    const updateMessage = {
      notice,
      name,
      email,
      phone,
      service,
      role,
    };
    if (existMessage) {
      await ContactModel.findByIdAndUpdate(id, updateMessage, {
        new: true,
      });

      res.status(200).json({ updateMessage, message: "Update Successful" });
    } else {
      res.status(400).json({ message: "Message Not Found" });
    }
  } catch (error) {
    res.status(500).json({ message: "Server Error!", error });
  }
}

// Update contact status
async function updateContactStatus(req, res) {
  const { status, id } = req.body;
  const existMessage = await ContactModel.findOne({ _id: id });

  try {
    const updateMessage = {
      status,
    };
    if (existMessage) {
      await ContactModel.findByIdAndUpdate(id, updateMessage, {
        new: true,
      });

      res.status(200).json({ updateMessage, message: "Update Successful" });
    } else {
      res.status(400).json({ message: "Message Not Found" });
    }
  } catch (error) {
    res.status(500).json({ message: "Server Error!", error });
  }
}

// Delete contact
async function deleteContact(req, res) {
  const id = req.params.id;
  let existMessage = await ContactModel.findOne({ _id: id });
  try {
    if (existMessage) {
      await ContactModel.findByIdAndDelete(id);
      res.status(200).json({ message: "Account Deleted" });
    } else {
      res.status(400).json({ message: "Message Does Not Exist" });
    }
  } catch (error) {
    res.status(500).json({ message: "Server Error!", error });
  }
}

module.exports = {
  createContact,
  getAllContact,
  getSingleContact,
  updateContact,
  deleteContact,
  updateContactStatus,
  getAllContactDefault,
  getAllSellerEmails,
  getAllClientEmails,
};

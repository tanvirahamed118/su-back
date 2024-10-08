require("dotenv").config();
const ClientModel = require("../models/client-model");
const SellerModel = require("../models/seller-model");
const OTPModel = require("../models/otp-model");
const VerifyModel = require("../models/verify-model");
const JobModel = require("../models/job-model");
const bcrypt = require("bcrypt");
const EMAIL = process.env.EMAIL;
const PASSWORD = process.env.PASSWORD;
const SECRET_KEY = process.env.SECRET_KEY;
const nodemailer = require("nodemailer");
const Mailgen = require("mailgen");
const jwt = require("jsonwebtoken");

// Get All Client
async function getClient(req, res) {
  try {
    const data = await ClientModel.find();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json(error);
  }
}

// get all client by admin
async function getAllClientsByAdmin(req, res) {
  try {
    const { page = 1, limit = 20, status = "" } = req.query;
    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const skip = (pageNumber - 1) * limitNumber;
    const filter = {};

    if (status) {
      filter.status = status;
    }

    const clients = await ClientModel.find(filter)
      .skip(skip)
      .limit(limitNumber);
    const updatedClients = await Promise.all(
      clients.map(async (client) => {
        const jobCount = await JobModel.countDocuments({
          jobEmail: client.email,
        });
        client.createdJobs = jobCount;
        return client;
      })
    );

    const totalClients = await ClientModel.countDocuments(filter);
    const totalPages = Math.ceil(totalClients / limitNumber);
    res.status(200).json({
      currentPage: pageNumber,
      totalPages,
      totalClients,
      clients: updatedClients,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Get client by id
async function getClientById(req, res) {
  const id = req.params.id;
  const existClient = await ClientModel.findOne({ _id: id });
  try {
    if (!existClient) {
      res.status(400).json({ message: "Data Not Found" });
    } else {
      res.status(200).json(existClient);
    }
  } catch (error) {
    res.status(500).json(error);
  }
}

// get client by email
async function getClientByEmail(req, res) {
  const { jobEmail } = req.query;

  const existClient = await ClientModel.findOne({ email: jobEmail });
  try {
    if (!existClient) {
      res.status(400).json({ message: "Data Not Found" });
    } else {
      res.status(200).json(existClient);
    }
  } catch (error) {
    res.status(500).json(error);
  }
}

// Register Client
async function register(req, res) {
  const {
    salutation,
    firstname,
    lastname,
    email,
    phone,
    secondPhone,
    username,
    newsletter,
    referance,
    password,
    agreement,
  } = req.body;
  const existCleintByEmail = await ClientModel.findOne({ email: email });
  const existSeller = await SellerModel.findOne({ email: email });
  const existCleintByUsername = await ClientModel.findOne({
    username: username,
  });

  try {
    if (existCleintByEmail || existSeller) {
      return res.status(404).json({ message: "Email Already Exist" });
    }
    if (existCleintByUsername) {
      return res.status(404).json({ message: "Username Already Exist" });
    }

    bcrypt.hash(password, 10, async function (err, hash) {
      const newClient = new ClientModel({
        salutation,
        firstname,
        lastname,
        email,
        phone,
        secondPhone,
        username,
        newsletter,
        referance,
        agreement,
        password: hash,
      });
      await newClient.save();
      await sendVerificationCode(username, email);
      res.status(201).json({
        client: newClient,
        message: "Registration Successful, please check your email",
      });
    });
  } catch (error) {
    res.status(500).json({ message: "Registration Faild!", error: error });
  }
}

// send varification code
async function sendVerificationCode(companyName, email) {
  const verificationCode = Math.floor(
    100000 + Math.random() * 900000
  ).toString();

  let otpData = new VerifyModel({
    email,
    code: verificationCode,
  });
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
      name: `Suisse-Offerten GmbH`,
      link: "https://suisseoffertengmbh.com",
    },
  });

  const emailTemplate = {
    body: {
      name: `${companyName}`,
      intro: `Welcome to Suisse-Offerten GmbH! Please use the following verification code to verify your email address:`,
      table: {
        data: [
          {
            "Your Verification Code": verificationCode,
          },
        ],
      },
      outro:
        "If you did not sign up for this account, you can ignore this email.",
    },
  };

  const emailBody = mailGenerator.generate(emailTemplate);

  const mailOptions = {
    from: EMAIL,
    to: email,
    subject: "Email Verification Code",
    html: emailBody,
  };

  await transporter.sendMail(mailOptions);
  await otpData.save();
  return verificationCode;
}

// verify code
async function VerifyCodeCheck(req, res) {
  try {
    const data = await VerifyModel.findOne({ code: req.body.code });
    const { email } = data || {};
    if (data) {
      const existClient = await ClientModel.findOne({ email: email });
      const existJob = await JobModel.findOne({ jobEmail: email });
      if (existClient?.status === "verified") {
        return res.status(500).json({ message: "Already verified" });
      }
      const updateClient = {
        status: "verified",
      };
      const updateJob = {
        status: "active",
      };
      const id = existClient?._id;
      await ClientModel.findByIdAndUpdate(id, updateClient, { new: true });
      await JobModel.findByIdAndUpdate(existJob?._id, updateJob, { new: true });
      res.status(200).json({ message: "verification successful" });
    } else {
      res.status(500).json({ message: "Enter wrong code!" });
    }
  } catch (error) {
    res.status(500).json(error);
  }
}

// Login Client
async function login(req, res) {
  const { input, password } = req.body;
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  let email;
  let username;
  if (emailPattern.test(input)) {
    email = input;
  } else {
    username = input;
  }

  try {
    const existClientByEmail = await ClientModel.findOne({ email: email });
    const existClientByUsername = await ClientModel.findOne({
      username: username,
    });

    if (email) {
      if (!existClientByEmail) {
        return res.status(404).json({ message: "Data Not Found" });
      }
      if (existClientByEmail?.status === "pending") {
        return res.status(404).json({ message: "Please verify your account" });
      }
    }
    if (username) {
      if (!existClientByUsername) {
        return res.status(404).json({ message: "Data Not Found" });
      }
      if (existClientByUsername?.status === "pending") {
        return res.status(404).json({ message: "Please verify your account" });
      }
    }

    const matchpassword = await bcrypt.compare(
      password,
      existClientByEmail
        ? existClientByEmail.password
        : existClientByUsername.password
    );
    if (!matchpassword) {
      return res.status(400).json({ message: "Incorrect Password" });
    }

    const token = jwt.sign(
      {
        email: existClientByEmail
          ? existClientByEmail.email
          : existClientByUsername.email,
        id: existClientByEmail
          ? existClientByEmail._id
          : existClientByUsername._id,
      },
      SECRET_KEY
    );
    res.status(200).json({
      client: existClientByEmail ? existClientByEmail : existClientByUsername,
      token: token,
      message: "Login Successful",
    });
  } catch (error) {
    res.status(500).json({ message: "Login Faild", error: error });
  }
}

// OTP Send
async function otpSend(req, res) {
  const { email } = req.body;
  try {
    const existClient = await ClientModel.findOne({ email: email });
    if (existClient) {
      let otp = Math.floor(Math.random() * 10000 + 1);
      let otpData = new OTPModel({
        email,
        code: otp,
        expireIn: new Date().getTime() + 300 * 1000,
      });
      await otpData.save();

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
          name: "name",
          link: "https://name.com",
        },
      });
      let response = {
        body: {
          name: existClient?.email,
          intro: "Reset your password",
          table: {
            data: [
              {
                Message: `your otp is ${otp}`,
              },
            ],
          },
          outro: "Thank You",
        },
      };
      let mail = await mailGenarator.generate(response);
      let message = {
        from: EMAIL,
        to: req.body.email,
        subject: "Reset Password",
        html: mail,
      };
      transport.sendMail(message).then(() => {
        return res.status(200).json({ email: email, message: "OTP Send" });
      });
    } else {
      res.status(400).json({ message: "Data Not Found" });
    }
  } catch (error) {
    res.status(500).json(error);
  }
}

// OTP Check
async function otpCheck(req, res) {
  try {
    const data = await OTPModel.findOne({ code: req.body.code });

    if (data) {
      let currentTime = new Date().getTime();
      let diffrenceTime = data.expireIn - currentTime;
      if (diffrenceTime < 0) {
        res.status(500).json({ message: "Token Expired" });
      } else {
        res.status(200).json({ message: "OTP Matched" });
      }
    } else {
      res.status(500).json({ message: "OTP Does Not Match" });
    }
  } catch (error) {
    res.status(500).json(error);
  }
}

// Change Password
async function changePassword(req, res) {
  const { email, password } = req.body;
  try {
    let client = await ClientModel.findOne({ email });
    if (client) {
      bcrypt.hash(password, 10, async function (err, hash) {
        client.password = hash;
        await client.save();
        res.status(200).json({ message: "Password Changed" });
      });
    } else {
      res.status(400).json({ message: "Data not found!" });
    }
  } catch (error) {
    res.status(500).json(error);
  }
}

// Update Client
async function updateClient(req, res) {
  const {
    salutation,
    firstname,
    lastname,
    email,
    phone,
    secondPhone,
    username,
    newsletter,
    referance,
    password,
    agreement,
  } = req.body;

  const id = req.params.id;
  const existClient = await ClientModel.findOne({ _id: id });
  try {
    if (existClient) {
      const updateClient = {
        salutation,
        firstname,
        lastname,
        email,
        phone,
        secondPhone,
        username,
        newsletter,
        referance,
        password,
        agreement,
      };
      await ClientModel.findByIdAndUpdate(id, updateClient, {
        new: true,
      });
      res
        .status(200)
        .json({ client: updateClient, message: "Update Successful" });
    } else {
      res.status(400).json({ message: "Data Not Found" });
    }
  } catch (error) {
    res.status(500).json({ message: "Update Failed", error: error });
  }
}

// Update Client stqtus
async function updateClientStatus(req, res) {
  const { status } = req.body;
  const id = req.params.id;
  const existClient = await ClientModel.findOne({ _id: id });
  try {
    if (existClient) {
      const newClientStatus = {
        status: status,
      };
      await ClientModel.findByIdAndUpdate(id, newClientStatus, {
        new: true,
      });
      res.status(200).json({ message: "Update Successful" });
    } else {
      res.status(400).json({ message: "Data Not Found" });
    }
  } catch (error) {
    res.status(500).json({ message: "Update Failed", error: error });
  }
}

// update client status by admin
async function updateClientStatusByAdmin(req, res) {
  const { id, status } = req.body;
  const existClient = await ClientModel.findOne({ _id: id });
  try {
    if (existClient) {
      const emailVerify = {
        status: status,
      };
      await ClientModel.findByIdAndUpdate(id, emailVerify, {
        new: true,
      });
      res.status(200).json({ message: "Update Successful" });
    } else {
      res.status(400).json({ message: "Data Not Found" });
    }
  } catch (error) {
    res.status(500).json({ message: "Update Failed", error: error });
  }
}

// Delete Client
async function deleteClient(req, res) {
  const id = req.params.id;
  let existClient = await ClientModel.findOne({ _id: id });
  try {
    if (existClient) {
      await ClientModel.findByIdAndDelete(id);
      res.status(200).json({ message: "Account Deleted" });
    } else {
      res.status(400).json({ message: "Data Not Exist" });
    }
  } catch (error) {
    res.status(500).json({ message: "Accoount Delete Failed!" });
  }
}

// create client by admin
async function createClientByAdmin(req, res) {
  const { username, email, phone, password } = req.body;
  const existClientByEmail = await ClientModel.findOne({ email: email });

  const existClientByUsername = await ClientModel.findOne({
    username: username,
  });
  const existSeller = await SellerModel.findOne({
    email: email,
  });
  try {
    if (existClientByEmail || existSeller) {
      return res.status(404).json({ message: "Email Already Exist" });
    }
    if (existClientByUsername) {
      return res.status(404).json({ message: "Username Already Exist" });
    }
    bcrypt.hash(password, 10, async function (err, hash) {
      const createClient = await new ClientModel({
        username,
        email,
        phone,
        password: hash,
      });
      await createClient.save();
      res.status(201).json({ message: "Account Created Successful" });
    });
  } catch (error) {
    res.status(500).json({ message: "Accoount Create Failed!" });
  }
}

module.exports = {
  getClient,
  getClientById,
  getClientByEmail,
  register,
  login,
  otpCheck,
  otpSend,
  changePassword,
  updateClient,
  deleteClient,
  updateClientStatus,
  VerifyCodeCheck,
  getAllClientsByAdmin,
  updateClientStatusByAdmin,
  createClientByAdmin,
};

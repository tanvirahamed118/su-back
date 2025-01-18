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
const supportMail = process.env.SUPPORT_MAIL;
const supportPhone = process.env.SUPPORT_PHONE;
const corsUrl = process.env.CORS_URL;

// Get All Client
async function getClient(req, res) {
  try {
    const data = await ClientModel.find();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ message: "Server Error!", error });
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

    const totalClients = await ClientModel.countDocuments(filter);
    const totalPages = Math.ceil(totalClients / limitNumber);
    res.status(200).json({
      currentPage: pageNumber,
      totalPages,
      totalClients,
      clients: clients,
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error!", error });
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
    res.status(500).json({ message: "Server Error!", error });
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
    res.status(500).json({ message: "Server Error!", error });
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
        referance,
        agreement,
        password: hash,
      });
      await newClient.save();
      await sendVerificationCode(username, email);
      res.status(201).json({
        client: newClient,
        message: "Registration Successful, Please Check Your Email",
      });
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error!", error });
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
      name: `Suisse-Offerten`,
      link: "https://suisse-offerten.ch/",
    },
  });
  const emailTemplate = {
    body: {
      name: `${companyName}`,
      intro: `Welcome to Suisse-Offerten! Please use the following verification code to verify your email address:`,
      table: {
        data: [
          {
            "Your Verification Code": verificationCode,
          },
        ],
      },
      outro: `
        <p style="font-size: 14px; color: #777;">Please check your email, you have receive verification code</p>
        <p style="font-size: 14px; color: #777; margin-top: 20px;">Suisse-Offerten</p>
        <p style="font-size: 14px; color: #4285F4;"><a href="${corsUrl}">Suisse-Offerten</a></p>
        <p style="font-size: 14px; color: #4285F4;">E-mail: ${supportMail}</p>
        <p style="font-size: 14px; color: #777;">Tel: ${supportPhone}</p>
      `,
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

// check verify code
async function VerifyCodeCheck(req, res) {
  try {
    const data = await VerifyModel.findOne({ code: req.body.code });
    const { email } = data || {};
    if (data) {
      const existClient = await ClientModel.findOne({ email: email });
      const existJob = await JobModel.findOne({ jobEmail: email });

      const matchingSellers = await SellerModel.find({
        $and: [
          { preference: { $in: existJob?.jobCity } },
          { activities: { $in: existJob?.jobSubCategories } },
        ],
      });
      if (existClient?.status === "verified") {
        return res.status(500).json({ message: "Already Verified" });
      }

      const sellerEmails = matchingSellers.map((seller) => seller.email);
      const sellerNames = matchingSellers.map((seller) => seller.username);
      const updateClient = {
        status: "verified",
      };
      const updateJob = {
        status: "active",
      };
      const id = existClient?._id;
      await ClientModel.findByIdAndUpdate(id, updateClient, { new: true });
      await JobModel.findByIdAndUpdate(existJob?._id, updateJob, { new: true });
      if (existJob) {
        await sendJobEmails(
          sellerEmails,
          existJob?.jobTitle,
          existJob?.jobDescription,
          existJob?.jobLocation,
          existJob?.jobNumber,
          sellerNames
        );
      }
      res.status(200).json({ message: "Verification Successful" });
    } else {
      res.status(500).json({ message: "Enter Wrong Code" });
    }
  } catch (error) {
    res.status(500).json({ message: "Server Error!", error });
  }
}

// send email to all seller after client verify their email
async function sendJobEmails(
  sellerEmails,
  jobTitle,
  jobDescription,
  jobLocation,
  uniqueNumber,
  sellerNames
) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: EMAIL,
      pass: PASSWORD,
    },
  });

  const mailGenerator = new Mailgen({
    theme: "default",
    product: {
      name: "Suiess-offerten",
      link: "https://suisse-offerten.ch/",
    },
  });
  for (let i = 0; i < sellerNames.length; i++) {
    const emailTemplate = {
      body: {
        name: sellerNames[i],
        intro: `A new job has been posted: ${jobTitle}`,

        outro: `
        <div style="border-top: 1px solid #ddd; margin: 20px 0; padding-top: 10px;">
          <strong style="font-size: 16px;">Job Title:</strong>
          <p style="font-size: 14px; color: #555;">${jobTitle}</p>
        </div>
        <div style="border-top: 1px solid #ddd; margin: 20px 0; padding-top: 10px;">
          <strong style="font-size: 16px;">Job Description:</strong>
          <p style="font-size: 14px; color: #555;">${jobDescription}</p>
        </div>
        <div style="border-top: 1px solid #ddd; margin: 20px 0; padding-top: 10px;">
          <strong style="font-size: 16px;">Job Location:</strong>
          <p style="font-size: 14px; color: #555;">${jobLocation}</p>
        </div>
        <div style="border-top: 1px solid #ddd; margin: 20px 0; padding-top: 10px;">
          <strong style="font-size: 16px;">Job Number:</strong>
          <p style="font-size: 14px; color: #555;">${uniqueNumber}</p>
        </div>
        <p style="font-size: 14px; color: #777;">Visit this link to see recent jobs <a href="${corsUrl}/search-job">See jobs</a></p>
        <p style="font-size: 14px; color: #777; margin-top: 20px;">Suisse-Offerten</p>
        <p style="font-size: 14px; color: #4285F4;"><a href="${corsUrl}">Suisse-Offerten</a></p>
        <p style="font-size: 14px; color: #4285F4;">E-mail: ${supportMail}</p>
        <p style="font-size: 14px; color: #777;">Tel: ${supportPhone}</p>
      `,
      },
    };

    const emailBody = mailGenerator.generate(emailTemplate);

    const message = {
      from: EMAIL,
      to: sellerEmails[i],
      subject: `New Job Posted: ${jobTitle}`,
      html: emailBody,
    };
    await transporter.sendMail(message);
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
        return res.status(404).json({ message: "Please Verify Your Account" });
      }
    }
    if (username) {
      if (!existClientByUsername) {
        return res.status(404).json({ message: "Data Not Found" });
      }
      if (existClientByUsername?.status === "pending") {
        return res.status(404).json({ message: "Please Verify Your Account" });
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
    res.status(500).json({ message: "Server Error!", error });
  }
}

// OTP Send
async function otpSend(req, res) {
  const { email } = req.body;
  try {
    const existClient = await ClientModel.findOne({ email: email });
    if (existClient) {
      let otp = Math.floor(100000 + Math.random() * 900000).toString();
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
          name: "suisse-offerten",
          link: "https://suisse-offerten.ch/",
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
          outro: `<p style="font-size: 14px; color: #777;">Please use this OTP code to change your password.</p>
        <p style="font-size: 14px; color: #777; margin-top: 20px;">Suisse-Offerten</p>
        <p style="font-size: 14px; color: #4285F4;"><a href="${corsUrl}">Suisse-Offerten</a></p>
        <p style="font-size: 14px; color: #4285F4;">E-mail: ${supportMail}</p>
        <p style="font-size: 14px; color: #777;">Tel: ${supportPhone}</p>`,
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
        return res
          .status(200)
          .json({ email: email, message: "OTP Send", status: "ok" });
      });
    } else {
      res.status(400).json({ message: "Data Not Found" });
    }
  } catch (error) {
    res.status(500).json({ message: "Server Error!", error });
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
    res.status(500).json({ message: "Server Error!", error });
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
      res.status(400).json({ message: "Data Not Found" });
    }
  } catch (error) {
    res.status(500).json({ message: "Server Error!", error });
  }
}

// change password by client
async function changePasswordByClient(req, res) {
  const { password } = req.body;
  const id = req.params.id;
  try {
    let client = await ClientModel.findOne({ _id: id });
    if (client) {
      bcrypt.hash(password, 10, async function (err, hash) {
        client.password = hash;
        await client.save();
        res.status(200).json({ message: "Password Changed" });
      });
    } else {
      res.status(400).json({ message: "Data Not Found!" });
    }
  } catch (error) {
    res.status(500).json({ message: "Server Error!", error });
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
    referance,
    agreement,
    newsletter,
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
        referance,
        agreement,
        newsletter,
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
    res.status(500).json({ message: "Server Error!", error });
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
    res.status(500).json({ message: "Server Error!", error });
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
    res.status(500).json({ message: "Server Error!", error });
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
    res.status(500).json({ message: "Server Error!", error });
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
    res.status(500).json({ message: "Server Error!", error });
  }
}

// send reset password link
async function sendResetPasswordLink(req, res) {
  const { email } = req.body;
  try {
    const existSeller = await ClientModel.findOne({ email: email });
    if (existSeller) {
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
          name: "Suisse-Offerten",
          link: "https://suisse-offerten.ch/",
        },
      });
      let response = {
        body: {
          name: existSeller?.email,
          intro: "Change your password",
          table: {
            data: [
              {
                Message: `Hello, If you don't remember your password and you did not get any email to reset password, you can use this like to reset your password. Link: https://suisse-offerten.ch/client-change-password`,
              },
            ],
          },
          outro: `<p style="font-size: 14px; color: #777;">Please check your email, you have receive reset password link</p>
        <p style="font-size: 14px; color: #777; margin-top: 20px;">Suisse-Offerten</p>
        <p style="font-size: 14px; color: #4285F4;"><a href="${corsUrl}">Suisse-Offerten</a></p>
        <p style="font-size: 14px; color: #4285F4;">E-mail: ${supportMail}</p>
        <p style="font-size: 14px; color: #777;">Tel: ${supportPhone}</p>`,
        },
      };
      let mail = await mailGenarator.generate(response);
      let message = {
        from: EMAIL,
        to: req.body.email,
        subject: "Change Password Link",
        html: mail,
      };
      transport.sendMail(message).then(() => {
        return res.status(200).json({
          email: email,
          message: "Link Send Successful",
          status: "ok",
        });
      });
    } else {
      res.status(400).json({ message: "Data Not Found" });
    }
  } catch (error) {
    res.status(500).json({ message: "Server Error!", error });
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
  changePasswordByClient,
  sendResetPasswordLink,
};

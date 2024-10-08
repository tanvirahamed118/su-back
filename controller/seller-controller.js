require("dotenv").config();
const SellerModel = require("../models/seller-model");
const ClientModel = require("../models/client-model");
const OTPModel = require("../models/otp-model");
const bcrypt = require("bcrypt");
const EMAIL = process.env.EMAIL;
const PASSWORD = process.env.PASSWORD;
const SECRET_KEY = process.env.SECRET_KEY;
const baseURL = process.env.CORS_URL;
const nodemailer = require("nodemailer");
const Mailgen = require("mailgen");
const jwt = require("jsonwebtoken");

// Get All Seller
async function getSeller(req, res) {
  try {
    const data = await SellerModel.find();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json(error);
  }
}

// get all seller by admin
async function getAllSellersByAdmin(req, res) {
  try {
    const { page = 1, limit = 20, status = "" } = req.query;
    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const skip = (pageNumber - 1) * limitNumber;
    const filter = {};

    if (status) {
      filter.status = status;
    }

    const sellers = await SellerModel.find(filter)
      .skip(skip)
      .limit(limitNumber);

    const totalSellers = await SellerModel.countDocuments(filter);
    const totalPages = Math.ceil(totalSellers / limitNumber);
    res.status(200).json({
      currentPage: pageNumber,
      totalPages,
      totalSellers,
      sellers: sellers,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Get Single Seller
async function getOneSeller(req, res) {
  const id = req.params.id;
  if (!id) {
    return res.status(400).json({ message: "ID is required" });
  }

  try {
    const existSeller = await SellerModel.findOne({ _id: id });

    if (!existSeller) {
      return res.status(400).json({ message: "Data Not Found" });
    } else {
      return res.status(200).json(existSeller);
    }
  } catch (error) {
    return res.status(500).json({ message: "Server Error", error });
  }
}

// Register Seller
async function register(req, res) {
  const {
    companyName,
    UIDNumber,
    person,
    email,
    phone,
    furtherInfo,
    username,
    newsletter,
    referance,
    password,
    agreement,
  } = req.body;
  const existSellerByEmail = await SellerModel.findOne({ email: email });
  const existSellerByUIDNumber = await SellerModel.findOne({
    UIDNumber: UIDNumber,
  });
  const existSellerByUsername = await SellerModel.findOne({
    username: username,
  });
  const existClient = await ClientModel.findOne({
    email: email,
  });

  try {
    if (existSellerByEmail || existClient) {
      return res.status(404).json({ message: "Email Already Exist" });
    }
    if (existSellerByUsername) {
      return res.status(404).json({ message: "Username Already Exist" });
    }
    if (existSellerByUIDNumber) {
      return res.status(404).json({ message: "UID Already Exist" });
    }
    bcrypt.hash(password, 10, async function (err, hash) {
      const newSeller = new SellerModel({
        companyName,
        UIDNumber,
        person,
        email,
        phone,
        furtherInfo,
        username,
        newsletter,
        referance,
        agreement,
        password: hash,
      });
      await newSeller.save();
      const token = jwt.sign(
        { id: newSeller._id, email: newSeller.email },
        SECRET_KEY,
        { expiresIn: "1d" }
      );
      await sendVerificationEmail(companyName, email, token);
      res.status(201).json({
        seller: newSeller,
        message: "Registration successful, please check your email",
      });
    });
  } catch (error) {
    res.status(500).json({ message: "Registration Faild!", error: error });
  }
}

// email send
async function sendVerificationEmail(companyName, email, token) {
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
      intro: `Welcome to Suisse-Offerten GmbH! Please verify your email address.`,
      action: {
        instructions: "Click the button below to verify your email:",
        button: {
          color: "#22BC66",
          text: "Verify Email",
          link: `${baseURL}/verify-email/${token}`,
        },
      },
      outro:
        "If you did not sign up for this account, you can ignore this email.",
    },
  };

  const emailBody = mailGenerator.generate(emailTemplate);

  const mailOptions = {
    from: EMAIL,
    to: email,
    subject: "Email Verification",
    html: emailBody,
  };

  await transporter.sendMail(mailOptions);
}

// seller email varification
async function sellerEmailVarification(req, res) {
  const { token } = req.query;

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    const seller = await SellerModel.findById(decoded.id);

    if (!seller) {
      return res
        .status(400)
        .json({ message: "Invalid token or seller not found" });
    }

    seller.emailVerify = true;
    await seller.save();

    return res.status(200).json({ message: "Email verified successfully!" });
  } catch (error) {
    return res.status(500).json({ message: "Invalid or expired token", error });
  }
}

// Login Seller
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
  const existSellerByEmail = await SellerModel.findOne({ email: email });
  const existSellerByUsername = await SellerModel.findOne({
    username: username,
  });

  try {
    if (email) {
      if (!existSellerByEmail) {
        return res.status(404).json({ message: "Seller Not Found" });
      }
      if (!existSellerByEmail?.emailVerify) {
        return res.status(404).json({ message: "Seller email not verifyed" });
      }
    }

    if (username) {
      if (!existSellerByUsername) {
        return res.status(404).json({ message: "Seller Not Found" });
      }
      if (!existSellerByUsername?.emailVerify) {
        return res.status(404).json({ message: "Seller email not verifyed" });
      }
    }

    const matchpassword = await bcrypt.compare(
      password,
      existSellerByEmail
        ? existSellerByEmail.password
        : existSellerByUsername.password
    );
    if (!matchpassword) {
      return res.status(400).json({ message: "Incorrect Password" });
    }

    const token = jwt.sign(
      {
        email: existSellerByEmail
          ? existSellerByEmail.email
          : existSellerByUsername.email,
        id: existSellerByEmail
          ? existSellerByEmail._id
          : existSellerByUsername._id,
      },
      SECRET_KEY
    );
    res.status(200).json({
      seller: existSellerByEmail ? existSellerByEmail : existSellerByUsername,
      token: token,
      message: "Login Successful",
    });
  } catch (error) {
    res.status(500).json({ message: "login Faild", error: error });
  }
}

// OTP Send
async function otpSend(req, res) {
  const { email } = req.body;
  try {
    const existSeller = await SellerModel.findOne({ email: email });
    if (existSeller) {
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
          name: existSeller?.email,
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
    let seller = await SellerModel.findOne({ email });
    if (seller) {
      bcrypt.hash(password, 10, async function (err, hash) {
        seller.password = hash;
        await seller.save();
        res.status(200).json({ message: "Password Changed" });
      });
    } else {
      res.status(400).json({ message: "Data not found!" });
    }
  } catch (error) {
    res.status(500).json(error);
  }
}

// Update seller
async function updateSeller(req, res) {
  const {
    salutation,
    firstName,
    lastName,
    director,
    dirfirstname,
    dirlastname,
    companyName,
    leagalForm,
    foundingYear,
    website,
    UIDNumber,
    iban,
    streetNo,
    postalCode,
    location,
    phone,
    secondPhone,
    password,
    newsletter,
  } = req.body;

  const id = req.params.id;
  const existSeller = await SellerModel.findOne({ _id: id });
  try {
    if (existSeller) {
      bcrypt.hash(password, 10, async function (err, hash) {
        const updateSeller = {
          salutation,
          firstName,
          lastName,
          director,
          dirfirstname,
          dirlastname,
          companyName,
          leagalForm,
          foundingYear,
          website,
          UIDNumber,
          iban,
          streetNo,
          postalCode,
          location,
          phone,
          secondPhone,
          newsletter,
          password: hash,
          memberShip: { status: "pending" },
        };
        await SellerModel.findByIdAndUpdate(id, updateSeller, {
          new: true,
        });
        res.status(200).json({ message: "Update Successful" });
      });
    } else {
      res.status(400).json({ message: "Data Not Found" });
    }
  } catch (error) {
    res.status(500).json({ message: "Update Failed", error: error });
  }
}

// Update seller stqtus
async function updateSellerStatus(req, res) {
  const { status } = req.body;
  const id = req.params.id;
  const existSeller = await SellerModel.findOne({ _id: id });
  try {
    if (existSeller) {
      const newSellerStatus = {
        status: status,
      };
      await SellerModel.findByIdAndUpdate(id, newSellerStatus, {
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

// Update seller stqtus
async function updateSellerStatusByAdmin(req, res) {
  const { role, id, status } = req.body;
  const existSeller = await SellerModel.findOne({ _id: id });
  try {
    if (existSeller) {
      if (role === "email") {
        if (status === "verified") {
          const emailVerify = {
            emailVerify: true,
          };
          await SellerModel.findByIdAndUpdate(id, emailVerify, {
            new: true,
          });
        } else {
          const emailVerify = {
            emailVerify: false,
          };
          await SellerModel.findByIdAndUpdate(id, emailVerify, {
            new: true,
          });
        }
      }
      if (role === "uid") {
        if (status === "verified") {
          const uidVerify = {
            uidVerify: true,
          };
          await SellerModel.findByIdAndUpdate(id, uidVerify, {
            new: true,
          });
        } else {
          const uidVerify = {
            uidVerify: false,
          };
          await SellerModel.findByIdAndUpdate(id, uidVerify, {
            new: true,
          });
        }
      }
      if (role === "address") {
        if (existSeller?.emailVerify && existSeller?.uidVerify) {
          if (status === "verified") {
            const addressVerify = {
              locationVerify: true,
              status: "verified",
            };
            await SellerModel.findByIdAndUpdate(id, addressVerify, {
              new: true,
            });
          } else {
            const addressVerify = {
              locationVerify: false,
            };
            await SellerModel.findByIdAndUpdate(id, addressVerify, {
              new: true,
            });
          }
        } else {
          return res
            .status(400)
            .json({ message: "Please verify email and uid!" });
        }
      }
      res.status(200).json({ message: "Update Successful" });
    } else {
      res.status(400).json({ message: "Data Not Found" });
    }
  } catch (error) {
    res.status(500).json({ message: "Update Failed", error: error });
  }
}

// update seller company info
async function updateSellerCompany(req, res) {
  const { companyDescription, companyTitle, companyInfo } = req.body;
  const id = req.params.id;
  const existSeller = await SellerModel.findOne({ _id: id });

  try {
    if (existSeller) {
      const updateSeller = {
        companyDescription,
        companyTitle,
        companyLogo: req?.files?.companyLogo[0]?.location,
        companyCover: req?.files?.companyCover[0]?.location,
        companyInfo: Array.isArray(companyInfo) ? companyInfo : [],
      };

      if (
        req.files["companyPictures"] &&
        req.files["companyPictures"].length > 0
      ) {
        updateSeller.companyPictures = req.files["companyPictures"].map(
          (file) => file.location
        );
      }

      await SellerModel.findByIdAndUpdate(id, updateSeller, { new: true });
      res.status(200).json({ message: "Update Successful" });
    } else {
      res.status(400).json({ message: "Data Not Found" });
    }
  } catch (error) {
    res.status(500).json({ message: "Update Failed", error: error.message });
  }
}

// update seller activity
async function updateSellerActivity(req, res) {
  const { activities, locations } = req.body;
  const { id } = req.params;

  const existSeller = await SellerModel.findOne({ _id: id });
  try {
    if (existSeller) {
      const newSellerActivity = {
        activities: [...activities],
        preference: [...locations],
      };
      await SellerModel.findByIdAndUpdate(id, newSellerActivity, {
        new: true,
      });
      res.status(200).json({ message: "Activity saved" });
    } else {
      res.status(400).json({ message: "Data Not Found" });
    }
  } catch (error) {
    res.status(500).json({ message: "Update Failed", error: error });
  }
}

// Delete seller
async function deleteSeller(req, res) {
  const id = req.params.id;
  let existSeller = await SellerModel.findOne({ _id: id });
  try {
    if (existSeller) {
      await SellerModel.findByIdAndDelete(id);
      res.status(200).json({ message: "Account Deleted" });
    } else {
      res.status(400).json({ message: "Data Not Exist" });
    }
  } catch (error) {
    res.status(500).json({ message: "Accoount Delete Failed!" });
  }
}

// create seller by admin
async function createSellerByAdmin(req, res) {
  const { username, email, phone, password } = req.body;
  const existSellerByEmail = await SellerModel.findOne({ email: email });

  const existSellerByUsername = await SellerModel.findOne({
    username: username,
  });
  const existClient = await ClientModel.findOne({
    email: email,
  });
  try {
    if (existSellerByEmail || existClient) {
      return res.status(404).json({ message: "Email Already Exist" });
    }
    if (existSellerByUsername) {
      return res.status(404).json({ message: "Username Already Exist" });
    }
    bcrypt.hash(password, 10, async function (err, hash) {
      const createSeller = await new SellerModel({
        username,
        email,
        phone,
        password: hash,
      });
      await createSeller.save();
      res.status(201).json({ message: "Account Created Successful" });
    });
  } catch (error) {
    res.status(500).json({ message: "Accoount Create Failed!" });
  }
}

module.exports = {
  getSeller,
  getOneSeller,
  register,
  login,
  otpCheck,
  otpSend,
  changePassword,
  updateSeller,
  deleteSeller,
  updateSellerStatus,
  updateSellerActivity,
  updateSellerCompany,
  sellerEmailVarification,
  getAllSellersByAdmin,
  updateSellerStatusByAdmin,
  createSellerByAdmin,
};

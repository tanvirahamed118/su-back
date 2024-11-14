require("dotenv").config();
const SellerModel = require("../models/seller-model");
const ClientModel = require("../models/client-model");
const OTPModel = require("../models/otp-model");
const ReviewModel = require("../models/review-model");
const bcrypt = require("bcrypt");
const EMAIL = process.env.EMAIL;
const PASSWORD = process.env.PASSWORD;
const SECRET_KEY = process.env.SECRET_KEY;
const baseURL = process.env.CORS_URL;
const nodemailer = require("nodemailer");
const Mailgen = require("mailgen");
const jwt = require("jsonwebtoken");
const supportMail = process.env.SUPPORT_MAIL;
const supportPhone = process.env.SUPPORT_PHONE;
const corsUrl = process.env.CORS_URL;

// Get All Seller
async function getAllSeller(req, res) {
  try {
    const { page = 1, limit = 20, category, location } = req.query;
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    const filter = {};
    if (category) {
      filter.categoryCode = { $in: [Number(category)] };
    }
    if (location) {
      filter.location = location;
    }
    const skip = (pageNumber - 1) * limitNumber;
    const sellers = await SellerModel.find(filter)
      .skip(skip)
      .limit(limitNumber);
    const datas = await Promise.all(
      sellers.map(async (seller) => {
        const latestReview = await ReviewModel.findOne({
          sellerId: seller._id,
        }).sort({ createdAt: -1 });
        return {
          ...seller._doc,
          reviewData: latestReview || null,
        };
      })
    );

    const totalSellers = await SellerModel.countDocuments(filter);
    const totalPages = Math.ceil(totalSellers / limitNumber);
    res.status(200).json({
      currentPage: pageNumber,
      totalPages,
      totalSellers,
      sellers: datas,
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error!", error });
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
    res.status(500).json({ message: "Server Error!", error });
  }
}

// Get Single Seller
async function getOneSeller(req, res) {
  const id = req.params.id;
  if (!id) {
    return res.status(400).json({ message: "ID is Required" });
  }
  try {
    const existSeller = await SellerModel.findOne({ _id: id });

    if (!existSeller) {
      return res.status(400).json({ message: "Data Not Found" });
    } else {
      return res.status(200).json(existSeller);
    }
  } catch (error) {
    return res.status(500).json({ message: "Server Error!", error });
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
        message: "Registration Successful, Please Check Your Email",
      });
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error!", error });
  }
}

// email send for varification
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
      name: `Suisse-Offerten`,
      link: "http://suisse-offerten.ch/",
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
      outro: `<p style="font-size: 14px; color: #777;">Please login to your account to check your verification process.</p>
        <p style="font-size: 14px; color: #777; margin-top: 20px;">Suisse-Offerten</p>
        <p style="font-size: 14px; color: #4285F4;"><a href="${corsUrl}">Suisse-Offerten</a></p>
        <p style="font-size: 14px; color: #4285F4;">E-mail: ${supportMail}</p>
        <p style="font-size: 14px; color: #777;">Tel: ${supportPhone}</p>`,
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
        .json({ message: "Invalid Token or Seller Not Found" });
    }
    seller.emailVerify = true;
    await seller.save();

    return res.status(200).json({ message: "Email Verified Successfully!" });
  } catch (error) {
    return res.status(500).json({ message: "Server Error!", error });
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
        return res.status(404).json({ message: "Seller Email Not Verifyed" });
      }
    }

    if (username) {
      if (!existSellerByUsername) {
        return res.status(404).json({ message: "Seller Not Found" });
      }
      if (!existSellerByUsername?.emailVerify) {
        return res.status(404).json({ message: "Seller Email Not Verifyed" });
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
    res.status(500).json({ message: "Server Error!", error });
  }
}

// OTP Send
async function otpSend(req, res) {
  const { email } = req.body;
  try {
    const existSeller = await SellerModel.findOne({ email: email });
    if (existSeller) {
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
          name: "Suisse-Offerten",
          link: "http://suisse-offerten.ch/",
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
          outro: `<p style="font-size: 14px; color: #777;">Please check your email, you have receive OTP code</p>
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
    let seller = await SellerModel.findOne({ email });
    if (seller) {
      bcrypt.hash(password, 10, async function (err, hash) {
        seller.password = hash;
        await seller.save();
        res.status(200).json({ message: "Password Changed" });
      });
    } else {
      res.status(400).json({ message: "Data Not Found" });
    }
  } catch (error) {
    res.status(500).json({ message: "Server Error!", error });
  }
}

// change password by seller
async function changePasswordBySeller(req, res) {
  const { password } = req.body;
  const id = req.params.id;
  try {
    let seller = await SellerModel.findOne({ _id: id });
    if (seller) {
      bcrypt.hash(password, 10, async function (err, hash) {
        seller.password = hash;
        await seller.save();
        res.status(200).json({ message: "Password Changed" });
      });
    } else {
      res.status(400).json({ message: "Data Not Found" });
    }
  } catch (error) {
    res.status(500).json({ message: "Server Error!", error });
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
    newsletter,
  } = req.body;

  const id = req.params.id;
  const existSeller = await SellerModel.findOne({ _id: id });
  try {
    if (existSeller) {
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
      };
      await SellerModel.findByIdAndUpdate(id, updateSeller, {
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
    res.status(500).json({ message: "Server Error!", error });
  }
}

// Update seller stqtus by admin
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
          await sendEmailNotification(
            existSeller.username,
            existSeller.email,
            `You have received a new notification from Suisse-Offerten Support Team`,
            `UID`
          );
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
            await sendEmailNotification(
              existSeller.username,
              existSeller.email,
              `You have received a new notification from Suisse-Offerten Support Team`,
              `Address`
            );
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
            .json({ message: "Please Verify Email and UID" });
        }
      }
      res.status(200).json({ message: "Update Successful" });
    } else {
      res.status(400).json({ message: "Data Not Found" });
    }
  } catch (error) {
    res.status(500).json({ message: "Server Error!", error });
  }
}

// send notification email
async function sendEmailNotification(name, email, subject, verify) {
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
      link: "https://suisse-offerten.ch",
    },
  });
  const emailTemplate = {
    body: {
      name: `${name}`,
      intro: `Good News...`,
      outro: `
        <div style="border-top: 1px solid #ddd; margin: 20px 0; padding-top: 10px;">
          <strong style="font-size: 16px;">Message:</strong>
          <p style="font-size: 14px; color: #555;">Your ${verify} is verified.</p>
        </div>
        <p style="font-size: 14px; color: #777;">Please login to your account to check your verification process.</p>
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
    subject: subject,
    html: emailBody,
  };
  await transporter.sendMail(mailOptions);
}

// update seller company info
async function updateSellerCompany(req, res) {
  const { companyDescription, companyTitle, companyInfo } = req.body;
  const id = req.params.id;

  try {
    const existSeller = await SellerModel.findById(id);

    if (!existSeller) {
      return res.status(400).json({ message: "Data Not Found" });
    }

    const basePath = `${req.protocol}://${req.get("host")}/public/uploads/`;

    // Handle companyLogo and companyCover if provided
    const companyLogo = req.files?.companyLogo?.[0]?.originalname
      ?.split(" ")
      .join("-");
    const companyCover = req.files?.companyCover?.[0]?.originalname
      ?.split(" ")
      .join("-");

    const updateSeller = {
      companyDescription,
      companyTitle,
      companyLogo: companyLogo ? `${basePath}${companyLogo}` : null,
      companyCover: companyCover ? `${basePath}${companyCover}` : null,
      companyInfo: Array.isArray(companyInfo) ? companyInfo : [],
    };

    // Handle multiple company pictures if provided
    if (req.files?.companyPictures && req.files.companyPictures.length > 0) {
      updateSeller.companyPictures = req.files.companyPictures.map(
        (file) => `${basePath}${file.originalname.split(" ").join("-")}`
      );
    }

    await SellerModel.findByIdAndUpdate(id, updateSeller, { new: true });
    res.status(200).json({ message: "Update Successful" });
  } catch (error) {
    res.status(500).json({ message: "Server Error!", error });
  }
}

// update seller activity
async function updateSellerActivity(req, res) {
  const { activities, locations, categoryCode, categories } = req.body;
  const { id } = req.params;

  const existSeller = await SellerModel.findOne({ _id: id });
  try {
    if (existSeller) {
      const newSellerActivity = {
        activities: [...activities],
        preference: [...locations],
        categories: [...categories],
        categoryCode: [...categoryCode],
      };
      await SellerModel.findByIdAndUpdate(id, newSellerActivity, {
        new: true,
      });
      res.status(200).json({ message: "Activity Saved" });
    } else {
      res.status(400).json({ message: "Data Not Found" });
    }
  } catch (error) {
    res.status(500).json({ message: "Server Error!", error });
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
    res.status(500).json({ message: "Server Error!", error });
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
    res.status(500).json({ message: "Server Error!", error });
  }
}

// Delete company pictures
async function deleteSellerCompanyPictures(req, res) {
  const { item, role } = req.body;
  const { id } = req.params;
  try {
    const existSeller = await SellerModel.findOne({ _id: id });
    let updateSeller;

    if (existSeller) {
      if (role === "cover") {
        updateSeller = await SellerModel.findByIdAndUpdate(
          id,
          { companyCover: null },
          { new: true }
        );
      } else if (role === "logo") {
        updateSeller = await SellerModel.findByIdAndUpdate(
          id,
          { companyLogo: null },
          { new: true }
        );
      } else {
        updateSeller = await SellerModel.findByIdAndUpdate(
          id,
          { $pull: { companyPictures: item } },
          { new: true }
        );
      }

      res
        .status(200)
        .json({ message: "Delete Successful", updatedSeller: updateSeller });
    } else {
      res.status(400).json({ message: "Data Not Found" });
    }
  } catch (error) {
    res.status(500).json({ message: "Server Error!", error });
  }
}

// Upload seller address
async function uploadSellerAddress(req, res) {
  const { postalCode, streetNo, location } = req.body;
  const { id } = req.params;
  try {
    const existSeller = await SellerModel.findOne({ _id: id });
    if (existSeller) {
      const basePath = `${req.protocol}://${req.get("host")}/public/uploads/`;
      const file = req?.file?.originalname.split(" ").join("-");
      const updateData = {
        postalCode,
        streetNo,
        location,
        addressFile: `${basePath ? `${basePath}${file}` : "null"}`,
      };
      await SellerModel.findByIdAndUpdate(id, updateData, { new: true });
      res.status(200).json({ message: "Submit Successful" });
    } else {
      res.status(400).json({ message: "Data Not Found" });
    }
  } catch (error) {
    res.status(500).json({ message: "Server Error!", error });
  }
}

module.exports = {
  getAllSeller,
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
  deleteSellerCompanyPictures,
  uploadSellerAddress,
  changePasswordBySeller,
};

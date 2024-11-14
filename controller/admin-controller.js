require("dotenv").config();
const AdminModel = require("../models/admin-model");
const bcrypt = require("bcrypt");
const SECRET_KEY = process.env.SECRET_KEY;
const jwt = require("jsonwebtoken");
const OTPModel = require("../models/otp-model");
const EMAIL = process.env.EMAIL;
const PASSWORD = process.env.PASSWORD;
const nodemailer = require("nodemailer");
const Mailgen = require("mailgen");
const supportMail = process.env.SUPPORT_MAIL;
const supportPhone = process.env.SUPPORT_PHONE;
const corsUrl = process.env.CORS_URL;

// Get All Admin
async function getAdmin(req, res) {
  try {
    const data = await AdminModel.find();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ message: "Server Error!", error });
  }
}

// Get Single Admin
async function getOneAdmin(req, res) {
  const id = req.params.id;
  const existAdmin = await AdminModel.findOne({ _id: id });
  try {
    if (!existAdmin) {
      res.status(400).json({ message: "Data Not Found" });
    } else {
      res.status(200).json(existAdmin);
    }
  } catch (error) {
    res.status(500).json({ message: "Server Error!", error });
  }
}

// Register Admin
async function register(req, res) {
  const { username, email, password, agreement } = req.body;
  const existAdmin = await AdminModel.findOne({ email: email });
  try {
    if (existAdmin) {
      return res.status(404).json({ message: "Email Already Exist" });
    }
    bcrypt.hash(password, 10, async function (err, hash) {
      const newAdmin = new AdminModel({
        username,
        email,
        password: hash,
        agreement,
      });
      const token = jwt.sign(
        { email: newAdmin.email, id: newAdmin._id },
        SECRET_KEY
      );
      await newAdmin.save();
      res.status(201).json({
        admin: newAdmin,
        token: "Bearer " + token,
        message: "Registration Successful",
      });
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error!", error });
  }
}

// Login Admin
async function login(req, res) {
  const { email, password } = req.body;
  try {
    const existAdmin = await AdminModel.findOne({ email: email });
    if (!existAdmin) {
      return res.status(404).json({ message: "Data Not Found" });
    }
    const matchpassword = await bcrypt.compare(password, existAdmin.password);
    if (!matchpassword) {
      return res.status(400).json({ message: "Incorrect Password" });
    }
    const token = jwt.sign(
      { email: existAdmin.email, id: existAdmin._id },
      SECRET_KEY
    );
    res.status(200).json({
      admin: existAdmin,
      token: token,
      message: "Login Successful",
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error!", error });
  }
}

// Update admin
async function updateAdmin(req, res) {
  const {
    username,
    fullname,
    email,
    phone,
    followers,
    about,
    facebook,
    instagram,
    linkedin,
    youtube,
    following,
    title,
    city,
    zip,
    country,
    businesId,
    computer,
    photoshop,
    microsoft,
    headline,
  } = req.body;
  const id = req.params.id;
  const existAdmin = await AdminModel.findOne({ _id: id });
  const profile = req?.files?.profile[0]?.originalname.split(" ").join("-");
  const cover = req?.files.cover[0]?.originalname?.split(" ")?.join("-");
  const basePath = `${req.protocol}://${req.get("host")}/public/uploads/`;
  try {
    if (existAdmin) {
      const UpdateAdmin = {
        username,
        fullname,
        email,
        phone,
        followers,
        about,
        facebook,
        instagram,
        linkedin,
        youtube,
        following,
        title,
        city,
        zip,
        country,
        businesId,
        computer,
        photoshop,
        microsoft,
        headline,
        profile: `${basePath ? `${basePath}${profile}` : "null"}`,
        cover: `${basePath ? `${basePath}${cover}` : "null"}`,
      };
      await AdminModel.findByIdAndUpdate(id, UpdateAdmin, {
        new: true,
      });
      res
        .status(200)
        .json({ admin: UpdateAdmin, message: "Update Successful" });
    } else {
      res.status(400).json({ message: "Data Not Found" });
    }
  } catch (error) {
    res.status(500).json({ message: "Server Error!", error });
  }
}

// OTP Send
async function otpSend(req, res) {
  const { email } = req.body;
  try {
    const existAdmin = await AdminModel.findOne({ email: email });
    if (existAdmin) {
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
          name: "suisse-offerten",
          link: "http://suisse-offerten.ch/",
        },
      });
      let response = {
        body: {
          name: existAdmin?.email,
          intro: "Reset your password",
          table: {
            data: [
              {
                Message: `your otp is ${otp}`,
              },
            ],
          },
          outro: `
        <p style="font-size: 14px; color: #777;">Please check your email, you have receive OTP code</p>
        <p style="font-size: 14px; color: #777; margin-top: 20px;">Suisse-Offerten</p>
        <p style="font-size: 14px; color: #4285F4;"><a href="${corsUrl}">Suisse-Offerten</a></p>
        <p style="font-size: 14px; color: #4285F4;">E-mail: ${supportMail}</p>
        <p style="font-size: 14px; color: #777;">Tel: ${supportPhone}</p>
      `,
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
    let admin = await AdminModel.findOne({ email });
    if (admin) {
      bcrypt.hash(password, 10, async function (err, hash) {
        admin.password = hash;
        await admin.save();
        res.status(200).json({ message: "Password Changed" });
      });
    } else {
      res.status(400).json({ message: "Data Not Found" });
    }
  } catch (error) {
    res.status(500).json({ message: "Server Error!", error });
  }
}

// admin password update
async function updateAdminPassword(req, res) {
  const { password } = req.body;
  const id = req.params.id;
  const existAdmin = await AdminModel.findOne({ _id: id });
  try {
    if (existAdmin) {
      bcrypt.hash(password, 10, async function (err, hash) {
        const updateAdmin = {
          password: hash,
        };
        await AdminModel.findByIdAndUpdate(id, updateAdmin, {
          new: true,
        });
        res.status(200).json({ message: "Password Changed" });
      });
    } else {
      res.status(400).json({ message: "Data Not Found" });
    }
  } catch (error) {
    res.status(500).json({ message: "Server Error!", error });
  }
}

// Delete admin
async function deleteAdmin(req, res) {
  const id = req.params.id;
  let existAdmin = await AdminModel.findOne({ _id: id });
  try {
    if (existAdmin) {
      await AdminModel.findByIdAndDelete(id);
      res.status(200).json({ message: "Account Deleted" });
    } else {
      res.status(400).json({ message: "Data Not Found" });
    }
  } catch (error) {
    res.status(500).json({ message: "Server Error!", error });
  }
}

module.exports = {
  getAdmin,
  getOneAdmin,
  register,
  login,
  updateAdmin,
  updateAdminPassword,
  deleteAdmin,
  otpSend,
  otpCheck,
  changePassword,
};

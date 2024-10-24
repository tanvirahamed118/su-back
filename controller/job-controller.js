const JobModel = require("../models/job-model");
const ClientModel = require("../models/client-model");
const SellerModel = require("../models/seller-model");
const VerifyModel = require("../models/verify-model");
const EMAIL = process.env.EMAIL;
const PASSWORD = process.env.PASSWORD;
const nodemailer = require("nodemailer");
const Mailgen = require("mailgen");
const OTPModel = require("../models/otp-model");
const bcrypt = require("bcrypt");
const supportMail = process.env.SUPPORT_MAIL;
const supportPhone = process.env.SUPPORT_PHONE;
const corsUrl = process.env.CORS_URL;

// get all job
async function getAllJob(req, res) {
  try {
    const { page = 1, limit = 20, category = "", location = "" } = req.query;
    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const decodedCategory = decodeURIComponent(category);
    const deSplit = decodedCategory.split("_").join(" ");
    const skip = (pageNumber - 1) * limitNumber;

    const filter = { status: "active" };
    if (category) {
      filter.jobCategoryCode = deSplit;
    }
    if (location) {
      filter.jobCity = location;
    }

    const jobs = await JobModel.find(filter).skip(skip).limit(limitNumber);
    const totalJobs = await JobModel.countDocuments(filter);
    const totalPages = Math.ceil(totalJobs / limitNumber);

    res.status(200).json({
      currentPage: pageNumber,
      totalPages,
      totalJobs,
      jobs,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// get all job by admin
async function getAllJobByAdmin(req, res) {
  try {
    const { page = 1, limit = 20, search = "", status = "" } = req.query;
    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);

    const skip = (pageNumber - 1) * limitNumber;

    const filter = {};

    if (search) {
      filter.jobNumber = search;
    }
    if (status) {
      filter.status = status;
    }

    const jobs = await JobModel.find(filter).skip(skip).limit(limitNumber);
    const totalJobs = await JobModel.countDocuments(filter);
    const totalPages = Math.ceil(totalJobs / limitNumber);

    res.status(200).json({
      currentPage: pageNumber,
      totalPages,
      totalJobs,
      jobs,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// get all job by admin
async function getAllJobDefault(req, res) {
  try {
    const jobs = await JobModel.find();
    res.status(200).json(jobs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// get jobs by category
async function getJobsByCategory(req, res) {
  const { category, page = 1, limit = 20 } = req.query;
  const skip = (page - 1) * limit;
  try {
    const query = category ? { jobCategoryCode: category } : {};
    const jobs = await JobModel.find(query).skip(skip).limit(Number(limit));
    const totalItems = await JobModel.countDocuments(query);
    res.status(200).json({ jobs, totalItems });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// get all jobs by client
async function getAllJobByClient(req, res) {
  try {
    const { page = 1, limit = 20, email } = req.query;
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    const skip = (pageNumber - 1) * limitNumber;
    const filter = {};

    if (email) {
      filter.jobEmail = email;
    }
    const jobs = await JobModel.find(filter).skip(skip).limit(limitNumber);
    const totalJobs = await JobModel.countDocuments(filter);
    const totalPages = Math.ceil(totalJobs / limitNumber);

    res.status(200).json({
      currentPage: pageNumber,
      totalPages,
      totalJobs,
      jobs,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// get all jobs by seller
async function getAllJobBySeller(req, res) {
  try {
    const {
      page = 1,
      limit = 20,
      id,
      category = "",
      location = "",
    } = req.query;
    const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
    const limitNumber = Math.max(parseInt(limit, 10) || 20, 1);
    const skip = (pageNumber - 1) * limitNumber;
    const existSeller = await SellerModel.findOne({ _id: id });
    if (!existSeller) {
      return res.status(404).json({ message: "Seller not found" });
    }
    const { preference: locations = [], activities = [] } = existSeller;

    if (locations.length === 0 || activities.length === 0) {
      return res.status(200).json({
        currentPage: pageNumber,
        totalPages: 0,
        totalJobs: 0,
        jobs: [],
      });
    }

    const filter = {
      $and: [
        { jobCity: { $in: locations } },
        { jobSubCategories: { $in: activities } },
      ],
      status: "active",
    };

    if (category) {
      filter.jobCategoryCode = category;
    }
    if (location) {
      filter.jobCity = location;
    }
    const jobs = await JobModel.find(filter).skip(skip).limit(limitNumber);
    const totalJobs = await JobModel.countDocuments(filter);
    const totalPages = Math.ceil(totalJobs / limitNumber);

    res.status(200).json({
      currentPage: pageNumber,
      totalPages,
      totalJobs,
      jobs,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// get one job
async function getOneJob(req, res) {
  const id = req.params.id;
  try {
    const offer = await JobModel.findOne({ _id: id });
    if (offer) {
      return res.status(200).json(offer);
    } else {
      return res.status(400).json({ message: "Data not found" });
    }
  } catch (error) {
    res.status(500).json(error);
  }
}

// create job
async function createJob(req, res) {
  const {
    jobTitle,
    jobDescription,
    jobCategoryCode,
    jobQuestions,
    jobPostcode,
    jobLocation,
    jobSiteVisitPossible,
    jobCompletionDate,
    jobEmail,
    clinetId,
    jobCity,
    username,
    password,
    jobSubCategories,
    credits,
    firstname,
    lastname,
    phone,
  } = req.body;

  try {
    let email;
    let jobUsername;
    let clientEmail = await ClientModel.findOne({ email: jobEmail });
    let clientUsername = await ClientModel.findOne({ username: username });
    let sellerEmail = await SellerModel.findOne({ email: jobEmail });
    let sellerUsername = await SellerModel.findOne({ username: username });
    const matchingSellers = await SellerModel.find({
      $and: [
        { preference: { $in: jobCity } }, // Match job location to seller preference
        { activities: { $in: jobSubCategories.split(",") } }, // Match job subcategories to seller activities
      ],
    });

    if (clientEmail) {
      return res.status(400).json({ message: "Account already exist" });
    }
    if (clientUsername) {
      return res.status(400).json({ message: "Username already exist" });
    }
    if (sellerEmail) {
      return res.status(400).json({ message: "Account already exist" });
    }
    if (sellerUsername) {
      return res.status(400).json({ message: "Username already exist" });
    }
    if (jobEmail) {
      email = jobEmail;
      jobUsername = username;
    } else {
      let clientEmail = await ClientModel.findOne({ _id: clinetId });
      email = clientEmail.email;

      jobUsername = clientEmail.username;
    }
    let file = [];

    if (req.files && req.files.length > 0) {
      for (let i = 0; i < req.files.length; i++) {
        file.push(req.files[i].location);
      }
    }

    const generatedNumbers = new Set();
    const generateNum = (min, max) => {
      let randomNumber;
      do {
        randomNumber = Math.floor(Math.random() * (max - min + 10)) + min;
      } while (generatedNumbers.has(randomNumber));
      generatedNumbers.add(randomNumber);
      return randomNumber;
    };
    const uniqueNumber = generateNum(100000, 10000000);
    // Apply the same filter logic used in the seller dashboard

    // Find sellers matching the filter

    const sellerEmails = matchingSellers.map((seller) => seller.email);
    const sellerNames = matchingSellers.map((seller) => seller.username);

    if (sellerEmails.length > 0 && clinetId) {
      await sendJobEmails(
        sellerEmails,
        jobTitle,
        jobDescription,
        jobLocation,
        uniqueNumber,
        sellerNames
      );
    }
    const job = new JobModel({
      jobTitle,
      jobCity,
      jobDescription,
      jobCategoryCode,
      jobQuestions,
      jobPostcode,
      jobLocation,
      jobSiteVisitPossible,
      jobCompletionDate,
      jobFiles: file,
      jobEmail: email,
      jobNumber: uniqueNumber,
      requireCredit: 2,
      jobUsername: jobUsername,
      jobSubCategories: jobSubCategories.split(","),
      status: clinetId ? "active" : "pending",
      credits,
    });
    await job.save();

    if (!clinetId) {
      bcrypt.hash(password, 10, async function (err, hash) {
        const client = new ClientModel({
          username,
          email: email,
          password: hash,
          firstname,
          lastname,
          phone,
        });
        await client.save();
        sendVerificationCode(username, email);
        res.status(201).json({
          message: "Job is pending, please verify your email",
        });
      });
    } else {
      res.status(201).json({ message: "Job Created Successful" });
    }
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
}

// send email to all exist seller
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
      link: "http://suisse-offerten.ch/",
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

// send client verification code
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
      outro: `<p style="font-size: 14px; color: #777;">If you did not sign up for this account, you can ignore this email.</p>
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
    subject: "Email Verification Code",
    html: emailBody,
  };
  await transporter.sendMail(mailOptions);
  await otpData.save();
  return verificationCode;
}

// check client email on database
async function CheckClient(req, res) {
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
          name: "Suisse-Offerten",
          link: "http://suisse-offerten.ch/",
        },
      });
      let response = {
        body: {
          name: existClient?.email,
          intro: "Suisse-Offerten OTP",
          table: {
            data: [
              {
                Message: `your otp is ${otp}`,
              },
            ],
          },
          outro: `<p style="font-size: 14px; color: #777;">Please check your email, you have receive verification code</p>
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
        subject: `Suisse-Offerten OTP: ${otp}`,
        html: mail,
      };
      transport.sendMail(message).then(() => {
        return res.status(200).json({ email: email, message: "OTP Send" });
      });
    } else {
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
          name: "Suisse-Offerten",
          link: "http://suisse-offerten.ch/",
        },
      });
      let response = {
        body: {
          name: existClient?.email,
          intro: "Suisse-Offerten OTP",
          table: {
            data: [
              {
                Message: `your otp is ${otp}`,
              },
            ],
          },
          outro: `<p style="font-size: 14px; color: #777;">Please check your email, you have receive verification code</p>
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
        subject: `Suisse-Offerten OTP: ${otp}`,
        html: mail,
      };
      transport.sendMail(message).then(() => {
        return res.status(200).json({ email: email, message: "OTP Send" });
      });
    }
  } catch (error) {
    res.status(500).json(error);
  }
}

// update job
async function updateJob(req, res) {
  const id = req.params.id;
  const {
    jobTitle,
    jobDescription,
    jobPostcode,
    jobLocation,
    jobSiteVisitPossible,
    jobCompletionDate,
    jobCity,
    status,
  } = req.body;

  try {
    let file = [];
    if (req.files && req.files.length > 0) {
      for (let i = 0; i < req.files.length; i++) {
        file.push(req.files[i].location);
      }
    }

    const updateOffer = {
      jobTitle,
      jobDescription,
      jobPostcode,
      jobLocation,
      jobSiteVisitPossible,
      jobCompletionDate,
      jobCity,
      jobImage: file,
      status,
    };

    await JobModel.findByIdAndUpdate(id, updateOffer, {
      new: true,
    });

    res.status(201).json({ message: "Update Successful" });
  } catch (error) {
    res.status(500).json(error);
  }
}

// delete job
async function deleteJob(req, res) {
  const id = req.params.id;
  let existEvent = await JobModel.findOne({ _id: id });
  try {
    if (existEvent) {
      await JobModel.findByIdAndDelete(id);
      res.status(200).json({ message: "Delete Successful" });
    } else {
      res.status(400).json({ message: "Data Not Found!" });
    }
  } catch (error) {
    res.status(500).json(error);
  }
}

// filter jobs
async function filterJob(req, res) {
  const { jobsCategory } = req.body;

  const jobs = await JobModel.find();
  const filterData = jobs.filter((item) =>
    jobsCategory.includes(item?.category)
  );
  try {
    res.status(200).json(filterData);
  } catch (error) {
    res.status(500).json(error);
  }
}

// filter jobs
async function updateJobStatus(req, res) {
  const { status } = req.body;
  const id = req.params.id;
  const existJob = await JobModel.findOne({ _id: id });
  try {
    if (existJob) {
      const updateStatus = {
        status: status,
      };
      await JobModel.findByIdAndUpdate(id, updateStatus, { new: true });
      res.status(200).json({ message: "Update successful" });
    } else {
      res.status(400).json({ message: "Data not found!" });
    }
  } catch (error) {
    res.status(500).json(error);
  }
}

module.exports = {
  getAllJob,
  getOneJob,
  createJob,
  updateJob,
  deleteJob,
  CheckClient,
  filterJob,
  getJobsByCategory,
  getAllJobByClient,
  getAllJobBySeller,
  getAllJobByAdmin,
  updateJobStatus,
  getAllJobDefault,
};

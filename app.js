require("./config/DBConnection");
const express = require("express");
const app = express();
const cors = require("cors");
const auth = require("./middlewares/auth");
const closeJob = require("./middlewares/closeJob");
const clientRouter = require("./routes/client-router");
const sellerRouter = require("./routes/seller.router");
const jobRouter = require("./routes/job-router");
const contactRouter = require("./routes/contact-router");
const communicationRouter = require("./routes/communication-router");
const reviewRouter = require("./routes/review-router");
const newsRouter = require("./routes/news-router");
const wishlistRouter = require("./routes/wishlist-router");
const paymentRouter = require("./routes/payment-router");
const proposalRouter = require("./routes/proposal-route");
const perticipationRouter = require("./routes/perticipation-route");
const offerRouter = require("./routes/offer-router");
const membershipRouter = require("./routes/membership-router");
const adminRouter = require("./routes/admin-router");
const settingRouter = require("./routes/sitesetting-router");
const categoryRouter = require("./routes/category-router");
const CORS_URL = process.env.CORS_URL;
const DASHBOARD_URL = process.env.DASHBOARD_URL;
const allowedOrigins = [CORS_URL, DASHBOARD_URL];
const cron = require("node-cron");

// App Use Middlewares
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

cron.schedule("0 0 * * *", () => {
  closeJob();
});

// All Routes
app.use("/auth/client", clientRouter);
app.use("/auth/seller", sellerRouter);
app.use("/auth/job", jobRouter);
app.use("/auth/contact", contactRouter);
app.use("/auth/communication", communicationRouter);
app.use("/auth/review", reviewRouter);
app.use("/auth/news", newsRouter);
app.use("/auth/wishlist", wishlistRouter);
app.use("/auth/payment", paymentRouter);
app.use("/auth/proposal", proposalRouter);
app.use("/auth/perticipation", perticipationRouter);
app.use("/auth/offer", offerRouter);
app.use("/auth/membership", membershipRouter);
app.use("/auth/admin", adminRouter);
app.use("/auth/setting", settingRouter);
app.use("/auth/category", categoryRouter);

// Home Route
app.get("/", auth, (req, res) => {
  res.send("Home Route");
});
// Route not founf
app.use((req, res, next) => {
  res.send("Route Not Found");
  next();
});
// Server error
app.use((req, res, next, err) => {
  if (err) {
    return err;
  } else {
    res.send("Server Error");
  }
  next();
});

module.exports = app;

const mongoose = require("mongoose");
const perticipationSchema = mongoose.Schema(
  {
    jobId: {
      type: String,
    },
    clientId: {
      type: String,
    },
    sellerId: {
      type: String,
    },
    jobTitle: {
      type: String,
    },
    jobNumber: {
      type: String,
    },
    jobLocation: {
      type: String,
    },
    status: {
      type: String,
      default: "progress",
    },
    message: {
      type: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("perticipation", perticipationSchema);

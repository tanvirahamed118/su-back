const mongoose = require("mongoose");
const offerSchema = mongoose.Schema(
  {
    sellerId: {
      type: String,
    },
    clientId: {
      type: String,
    },
    jobId: {
      type: String,
    },
    message: {
      type: String,
    },
    perticipationId: {
      type: String,
    },
    jobTitle: {
      type: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("offer", offerSchema);

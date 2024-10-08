const mongoose = require("mongoose");
const proposalSchema = mongoose.Schema(
  {
    priceUnit: {
      type: String,
    },
    offerPrice: {
      type: Number,
    },
    offerNote: {
      type: String,
    },
    offerFiles: {
      type: String,
    },
    status: {
      type: String,
      default: "pending",
    },
    sellerId: {
      type: String,
    },
    jobId: {
      type: String,
    },
    jobTitle: {
      type: String,
    },
    jobLocation: {
      type: String,
    },
    jobNumber: {
      type: Number,
    },
    compititor: {
      type: Number,
    },
    clientId: {
      type: String,
    },
    clientName: {
      type: String,
    },
    clientPhone: {
      type: String,
    },
    sellerName: {
      type: String,
    },
    sellerPhone: {
      type: String,
    },
    reviewRequest: {
      type: Boolean,
    },
    view: {
      type: String,
    },
    requestView: {
      type: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("proposal", proposalSchema);

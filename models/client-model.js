const mongoose = require("mongoose");
const clientSchema = mongoose.Schema(
  {
    salutation: {
      type: String,
    },
    firstname: {
      type: String,
    },
    lastname: {
      type: String,
    },
    phone: {
      type: String,
    },
    secondPhone: {
      type: Number,
    },
    email: {
      type: String,
      unique: true,
    },
    username: {
      type: String,
      unique: true,
    },
    password: {
      type: String,
    },
    referance: {
      type: String,
    },
    agreement: {
      type: Boolean,
    },
    newsletter: {
      type: Boolean,
    },
    status: {
      type: String,
      default: "pending",
    },
    createdJobs: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("client", clientSchema);

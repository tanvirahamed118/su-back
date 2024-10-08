const mongoose = require("mongoose");
const SitesettingSchema = mongoose.Schema(
  {
    heading: {
      type: String,
    },
    favicon: {
      type: String,
    },
    headerlogo: {
      type: String,
    },
    footerlogo: {
      type: String,
    },
    footer: {
      type: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("sitesetting", SitesettingSchema);

const mongoose = require("mongoose");
const categoriesSchema = mongoose.Schema(
  {
    title: {
      type: String,
    },
    logo: {
      type: String,
    },
    image: {
      type: String,
    },
    category: {
      type: String,
    },
    lists: {
      type: Array,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("category", categoriesSchema);

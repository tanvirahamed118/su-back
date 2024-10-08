const SitesettingModel = require("../models/sitesetting-model");

// get sitesetting
const getSiteSetting = async (req, res) => {
  try {
    const data = await SitesettingModel.findOne();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// create sitesetting
const createSiteSetting = async (req, res) => {
  const { heading, footer } = req.body;
  try {
    const settingData = new SitesettingModel({
      heading,
      footer,
      footerlogo: req?.files?.footerlogo[0]?.location,
      headerlogo: req?.files?.headerlogo[0]?.location,
      favicon: req?.files?.favicon[0]?.location,
    });
    await settingData.save();
    res.status(200).json("Created successful");
  } catch (error) {
    res.status(500).json({ error: error, message: "Create Faild!" });
  }
};

// update sitesetting
const updateSiteSetting = async (req, res) => {
  const id = req.params.id;
  const { heading, footer } = req.body;

  const settingData = {
    heading,
    footer,
    footerlogo: req?.files?.footerlogo[0]?.location,
    headerlogo: req?.files?.headerlogo[0]?.location,
    favicon: req?.files?.favicon[0]?.location,
  };
  let exiistSetting = await SitesettingModel.findOne({ _id: id });
  try {
    if (exiistSetting) {
      await SitesettingModel.findByIdAndUpdate(id, settingData, {
        new: true,
      });
      res.status(200).json({ message: "Saved successful" });
    } else {
      res.status(400).json("Data Not Found!");
    }
  } catch (error) {
    res.status(500).json(error);
  }
};

module.exports = {
  getSiteSetting,
  createSiteSetting,
  updateSiteSetting,
};

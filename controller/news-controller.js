const NewsModel = require("../models/news-model");

// get all news
async function getAllNews(req, res) {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const skip = (pageNumber - 1) * limitNumber;
    const news = await NewsModel.find().skip(skip).limit(limitNumber);
    const totalNews = await NewsModel.countDocuments();
    const totalPages = Math.ceil(totalNews / limitNumber);
    res.status(200).json({
      currentPage: pageNumber,
      totalPages,
      totalNews,
      news: news,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// get all news
async function getAllNewsByAdmin(req, res) {
  try {
    const { page = 1, limit = 20, status = "" } = req.query;
    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const skip = (pageNumber - 1) * limitNumber;
    const filter = {};

    if (status) {
      filter.status = status;
    }

    const news = await NewsModel.find(filter).skip(skip).limit(limitNumber);

    const totalNews = await NewsModel.countDocuments(filter);
    const totalPages = Math.ceil(totalNews / limitNumber);
    res.status(200).json({
      currentPage: pageNumber,
      totalPages,
      totalNews,
      news: news,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// get single news
async function getsingleNews(req, res) {
  const id = req.params.id;
  try {
    const exiistNews = await NewsModel.findOne({ _id: id });
    if (exiistNews) {
      res.status(200).json(exiistNews);
    } else {
      res.status(400).json({ message: "Data Not Found!" });
    }
  } catch (error) {
    res.status(500).json(error);
  }
}

// create news
async function createNews(req, res) {
  const { nameOfStation, senderEmail, reference, news, sendName, status } =
    req.body;
  try {
    const newsData = new NewsModel({
      nameOfStation,
      senderEmail,
      reference,
      news,
      sendName,
      status,
    });

    await newsData.save();
    res.status(200).json({ message: "Created successful" });
  } catch (error) {
    res.status(500).json({ error: error, message: "Create Faild!" });
  }
}

// update news
async function updateNews(req, res) {
  const id = req.params.id;
  const { nameOfStation, senderEmail, reference, news, status, sendName } =
    req.body;

  let exiistNews = await NewsModel.findOne({ _id: id });
  try {
    if (exiistNews) {
      const newsData = {
        nameOfStation,
        senderEmail,
        reference,
        news,
        sendName,
        status,
      };
      await NewsModel.findByIdAndUpdate(id, newsData, {
        new: true,
      });
      res.status(200).json({ message: "Saved successful" });
    } else {
      res.status(400).json("Data Not Found!");
    }
  } catch (error) {
    res.status(500).json(error);
  }
}

// delete news
async function deleteNews(req, res) {
  const id = req.params.id;
  let exiistNews = await NewsModel.findOne({ _id: id });
  try {
    if (exiistNews) {
      await NewsModel.findByIdAndDelete(id);
      res.status(200).json({ message: "Delete Successful" });
    } else {
      res.status(400).json({ message: "Data Not Found!" });
    }
  } catch (error) {
    res.status(500).json({ message: "Delete Failed!" });
  }
}

module.exports = {
  getAllNews,
  getsingleNews,
  createNews,
  updateNews,
  deleteNews,
  getAllNewsByAdmin,
};

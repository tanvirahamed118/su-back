const CategoryModel = require("../models/category-model");

// get all category
const getAllCategory = async (req, res) => {
  try {
    const data = await CategoryModel.find();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// get aone category
const getOneCategory = async (req, res) => {
  const id = req.params.id;
  let existCategory = await CategoryModel.findOne({ _id: id });
  try {
    if (existCategory) {
      const data = await CategoryModel.findOne({ _id: id });
      res.status(200).json(data);
    } else {
      res.status(400).json("Data Not Found!");
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// create sitesetting
const createCategory = async (req, res) => {
  const { title, category, lists } = req.body;
  try {
    const settingData = new CategoryModel({
      title,
      category,
      image: req?.files?.image[0]?.location,
      logo: req?.files?.logo[0]?.location,
      lists: [lists],
    });
    await settingData.save();
    res.status(200).json("Created successful");
  } catch (error) {
    res.status(500).json({ error: error, message: "Create Faild!" });
  }
};

// update sitesetting
const updateCategory = async (req, res) => {
  const id = req.params.id;
  const { title, category, lists } = req.body;

  const categoryData = {
    title,
    category,
    image: req?.files?.image[0]?.location,
    logo: req?.files?.logo[0]?.location,
    lists: [lists],
  };
  let existCategory = await CategoryModel.findOne({ _id: id });
  try {
    if (existCategory) {
      await CategoryModel.findByIdAndUpdate(id, categoryData, {
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

// delete category
async function deleteCategory(req, res) {
  const id = req.params.id;
  let existCategory = await CategoryModel.findOne({ _id: id });
  try {
    if (existCategory) {
      await CategoryModel.findByIdAndDelete(id);
      res.status(200).json({ message: "Account Deleted" });
    } else {
      res.status(400).json({ message: "Data Not Exist" });
    }
  } catch (error) {
    res.status(500).json({ message: "Accoount Delete Failed!" });
  }
}

module.exports = {
  getAllCategory,
  getOneCategory,
  createCategory,
  updateCategory,
  deleteCategory,
};

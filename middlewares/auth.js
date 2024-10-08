require("dotenv").config();
const jwt = require("jsonwebtoken");
const secretkey = process.env.SECRET_KEY;

const auth = (req, res, next) => {
  try {
    let token = req.headers.token;
    if (token) {
      token = token.split(" ")[1];
      let user = jwt.verify(token, secretkey);
      req.userId = user.id;
    } else {
      return res.status(400).json({ message: "unauthorize User" });
    }

    next();
  } catch (error) {
    res.status(401).json({ message: "unauthorize user" });
  }
};

module.exports = auth;

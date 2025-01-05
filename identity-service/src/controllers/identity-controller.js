const RefreshToken = require("../models/refreshToken.js");
const User = require("../models/User.js");
const generateTokens = require("../utils/generateToken.js");
const logger = require("../utils/logger.js");
const {
  validateRegistration,
  validateLogin,
} = require("../utils/validation.js");

// user registration
const registerUser = async (req, res) => {
  logger.info("Registration endpoint hit...");
  try {
    const { error } = validateRegistration(req.body);
    if (error) {
      logger.warn("valiadtion error", error.details[0].message);
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }
    const { email, password, username } = req.body;
    let user = await User.findOne({ $or: [{ email }, { username }] });
    if (user) {
      logger.warn("User already exits");
      return res.status(400).json({
        success: false,
        message: "User already exits",
      });
    }
    user = new User({ username, email, password });
    await user.save();
    logger.warn("User ceated successfully!", user._id);
    const { accessToken, refreshToken } = await generateTokens(user);
    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      accessToken,
      refreshToken,
    });
  } catch (error) {
    logger.error("Registration error occured!", error);
    return res.json({
      success: false,
      message: "Internal server error",
    });
  }
};
// user login
const loginUser = async (req, res) => {
  logger.info("Login endpoint hit...");
  try {
    const { error } = validateLogin(req.body);
    if (error) {
      logger.warn("valiadtion error", error.details[0].message);
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }
    const { password, email } = req.body;
    let user = await User.findOne({ email });
    if (!user) {
      logger.warn("User not found");
      return res.status(400).json({
        success: false,
        message: "User not found",
      });
    }
    let isMatch = user.comparePassword(password);
    if (!isMatch) {
      logger.warn("password is not correct");
      return res.status(400).json({
        success: false,
        message: "password is not correct",
      });
    }
    const { accessToken, refreshToken } = await generateTokens(user);
    logger.warn("User Login successfully!");
    return res.json({
      accessToken,
      refreshToken,
      userId: user?._id,
    });
  } catch (error) {
    logger.error("Registration error occured!", error);
    return res.json({
      success: false,
      message: "Internal server error",
    });
  }
};
// refresh token
const refreshTokenUser = async (req, res) => {
  logger.info("Refresh token endpoint hit...");
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      logger.warn("Refresh Token is missing");
      return res.status(400).json({
        success: false,
        message: "Refresh Token is missing",
      });
    }
    const storedToken = await RefreshToken.findOne({ token: refreshToken });
    if (!storedToken || storedToken.expiresAt < new Date()) {
      logger.warn("Invalid or expired refresh Token");
      return res.status(401).json({
        success: false,
        message: "Invalid or expired refresh Token",
      });
    }
    const user = await User.findById(storedToken.user);
    if (!user) {
      logger.warn("User not found");
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }
    const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
      await generateTokens(user);

    // delete or accissed Token
    await RefreshToken.deleteOne({ _id: storedToken?._id });
    return res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    logger.error("Refresh token error occured!", error);
    return res.json({
      success: false,
      message: "Internal server error",
    });
  }
};

// logout
const logoutUser = async (req, res) => {
  logger.info("Logout endpoint hit...");
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      logger.warn("Refresh Token is missing");
      return res.status(400).json({
        success: false,
        message: "Refresh Token is missing",
      });
    }
    await RefreshToken.deleteOne({ token: refreshToken });
    logger.info("Refresh token deleted for logout!");
    return res.json({
      success: true,
      message: "Logout successfully!",
    });
  } catch (error) {
    logger.error("Error while logout!", error);
    return res.json({
      success: false,
      message: "Internal server error",
    });
  }
};

//exports
module.exports = { registerUser, loginUser, refreshTokenUser, logoutUser };

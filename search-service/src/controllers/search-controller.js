const Search = require("../models/Search");
const logger = require("../utils/logger");

// implement caching here for 2 to 5 min
const searchPostController = async (req, res) => {
  logger.info("Search endpoint hit!");
  try {
    const { query } = req.query;
    const results = await Search.find(
      {
        $text: { $search: query },
      },
      {
        score: { $meta: "textScore" },
      }
    )
      .sort({ score: { $meta: "textScore" } })
      .limit(10);
    res.json(results);
  } catch (error) {
    logger.error("search Service", error);
    res.status(500).json({
      success: false,
      message: "Error deleting post",
    });
  }
};
module.exports = { searchPostController };

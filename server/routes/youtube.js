const express = require("express");
const {
  getTrendingVideos,
  searchVideos,
  getVideosByCategory,
  getVideoDetails,
} = require("../controllers/youtubeController");

const router = express.Router();

router.get("/trending", getTrendingVideos);
router.get("/search", searchVideos);
router.get("/category", getVideosByCategory);
router.get("/details", getVideoDetails);

module.exports = router;

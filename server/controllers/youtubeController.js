const axios = require("axios");

const getApiKey = () => {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    const error = new Error("Server missing API Key");
    error.statusCode = 500;
    throw error;
  }
  return apiKey;
};

const getMaxResults = (value) => {
  const maxResults = Number.parseInt(value, 10);
  return Number.isInteger(maxResults)
    ? Math.min(Math.max(maxResults, 1), 50)
    : 24;
};

// @desc    Get Trending Videos
// @route   GET /api/youtube/trending
// @access  Public
exports.getTrendingVideos = async (req, res) => {
  try {
    const regionCode = String(req.query.regionCode || "VN").trim().toUpperCase();
    const maxResults = getMaxResults(req.query.maxResults);
    const API_KEY = getApiKey();
    if (!/^[A-Z]{2}$/.test(regionCode)) {
      return res.status(400).json({ success: false, message: "regionCode không hợp lệ" });
    }

    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&chart=mostPopular&regionCode=${regionCode}&maxResults=${maxResults}&key=${API_KEY}`;

    const response = await axios.get(url);
    res.status(200).json(response.data);
  } catch (error) {
    console.error("YouTube API Error:", error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: "Lỗi khi gọi YouTube API",
      error: error.response?.data,
    });
  }
};

// @desc    Search Videos
// @route   GET /api/youtube/search
// @access  Public
exports.searchVideos = async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    const maxResults = getMaxResults(req.query.maxResults);

    if (!q) {
      return res
        .status(400)
        .json({ success: false, message: "Missing query param" });
    }
    const API_KEY = getApiKey();

    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${encodeURIComponent(
      q
    )}&maxResults=${maxResults}&key=${API_KEY}`;

    const response = await axios.get(url);
    res.status(200).json(response.data);
  } catch (error) {
    console.error(
      "YouTube Search Error:",
      error.response?.data || error.message
    );
    res.status(500).json({ success: false, error: error.response?.data });
  }
};

// @desc    Get Videos by Category
// @route   GET /api/youtube/category
// @access  Public
exports.getVideosByCategory = async (req, res) => {
  try {
    const categoryId = String(req.query.categoryId || "").trim();
    const regionCode = String(req.query.regionCode || "VN").trim().toUpperCase();
    const maxResults = getMaxResults(req.query.maxResults);
    if (!/^\d+$/.test(categoryId) || !/^[A-Z]{2}$/.test(regionCode)) {
      return res.status(400).json({ success: false, message: "Tham số danh mục không hợp lệ" });
    }
    const API_KEY = getApiKey();

    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&chart=mostPopular&videoCategoryId=${categoryId}&regionCode=${regionCode}&maxResults=${maxResults}&key=${API_KEY}`;

    const response = await axios.get(url);
    res.status(200).json(response.data);
  } catch (error) {
    res.status(500).json({ success: false, error: error.response?.data });
  }
};

// @desc    Get Video Details
// @route   GET /api/youtube/details
// @access  Public
exports.getVideoDetails = async (req, res) => {
  try {
    const id = String(req.query.id || "")
      .split(",")
      .map((value) => value.trim())
      .filter((value) => /^[a-zA-Z0-9_-]{1,20}$/.test(value))
      .slice(0, 50)
      .join(",");
    const API_KEY = getApiKey();
    if (!id) {
      return res.status(400).json({ success: false, message: "Thiếu danh sách video hợp lệ" });
    }

    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${id}&key=${API_KEY}`;

    const response = await axios.get(url);
    res.status(200).json(response.data);
  } catch (error) {
    res.status(500).json({ success: false, error: error.response?.data });
  }
};

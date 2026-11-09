const axios = require("axios");

// @desc    Chat with Gemini AI
// @route   POST /api/gemini/chat
// @access  Public
exports.chatWithGemini = async (req, res) => {
  try {
    const prompt = typeof req.body.prompt === "string" ? req.body.prompt.trim() : "";
    const API_KEY = process.env.GEMINI_API_KEY;

    if (!prompt || prompt.length > 4000) {
      return res.status(400).json({
        success: false,
        message: "Prompt phải có từ 1 đến 4000 ký tự",
      });
    }

    if (!API_KEY) {
      return res
        .status(500)
        .json({ success: false, message: "Missing Gemini API Key" });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
    };

    const response = await axios.post(url, payload, {
      headers: { "Content-Type": "application/json" },
    });

    res.status(200).json(response.data);
  } catch (error) {
    console.error("Gemini API Error:", error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      success: false,
      message: "Gemini Error",
      error: error.response?.data?.error?.message || "Upstream request failed",
    });
  }
};

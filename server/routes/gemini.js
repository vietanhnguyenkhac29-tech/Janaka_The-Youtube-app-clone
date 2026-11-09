const express = require("express");
const { chatWithGemini } = require("../controllers/geminiController");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.post("/chat", protect, chatWithGemini);

module.exports = router;
chatWithGemini;

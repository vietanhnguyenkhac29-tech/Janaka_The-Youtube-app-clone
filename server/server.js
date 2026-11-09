const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const connectDB = require("./config/db");

// Load env vars
dotenv.config();

// Connect to Database
connectDB();

const app = express();

// Middleware
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:5500,http://127.0.0.1:5500")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("Origin is not allowed"));
  },
}));
app.use(express.json({ limit: "64kb" }));

// Phục vụ file tĩnh trong thư mục uploads (cho stream video)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Basic Route
app.get("/", (req, res) => {
  res.send("Janaka Video API is running...");
});

// Define Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/youtube", require("./routes/youtube"));
app.use("/api/gemini", require("./routes/gemini"));
app.use("/api/videos", require("./routes/video"));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

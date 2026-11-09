const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const {
  uploadVideo,
  getVideos,
  getVideoById,
  deleteVideo,
  streamVideo,
} = require("../controllers/videoController");

const router = express.Router();

// Đảm bảo thư mục uploads tồn tại
const uploadsDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

/**
 * Cấu hình Multer: lưu video vào ổ đĩa server.
 * - Không giới hạn kích thước file (tận dụng dung lượng ổ đĩa server).
 * - Chỉ chấp nhận file video (mp4, webm, ogg).
 * - Tên file là timestamp + random hex để tránh trùng lặp.
 */
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.random().toString(16).slice(2, 10);
    const ext = path.extname(file.originalname).toLowerCase() || ".mp4";
    cb(null, `video-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (_req, file, cb) => {
  const allowedTypes = ["video/mp4", "video/webm", "video/ogg"];
  const allowedExtensions = [".mp4", ".webm", ".ogg"];
  const extension = path.extname(file.originalname).toLowerCase();

  if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(extension)) {
    cb(null, true);
  } else {
    cb(new Error("Chỉ chấp nhận file video: MP4, WebM hoặc Ogg"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  // Không đặt limits.fileSize → không giới hạn kích thước file
});

// Routes

// GET  /api/videos          - Danh sách video (có phân trang)
router.get("/", getVideos);

// GET  /api/videos/:id      - Chi tiết 1 video
router.get("/:id", getVideoById);

// GET  /api/videos/stream/:filename  - Stream video file
router.get("/stream/:filename", streamVideo);

// POST /api/videos/upload   - Upload video mới
router.post("/upload", (req, res, next) => {
  upload.single("video")(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ message: `Lỗi upload: ${err.message}` });
    }
    if (err) {
      return res.status(400).json({ message: err.message });
    }
    next();
  });
}, uploadVideo);

// DELETE /api/videos/:id    - Xóa video
router.delete("/:id", deleteVideo);

module.exports = router;

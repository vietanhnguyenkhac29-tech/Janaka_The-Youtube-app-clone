const Video = require("../models/Video");
const path = require("path");
const fs = require("fs");

/**
 * @desc    Upload video lên server
 * @route   POST /api/videos/upload
 * @access  Public
 */
const uploadVideo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Vui lòng chọn file video để upload" });
    }

    const { title, description } = req.body;

    if (!title || !title.trim()) {
      // Xóa file đã upload nếu thiếu thông tin
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({ message: "Tiêu đề video là bắt buộc" });
    }

    const mimeTypesByExtension = {
      ".mp4": "video/mp4",
      ".webm": "video/webm",
      ".ogg": "video/ogg",
    };
    const mimetype =
      mimeTypesByExtension[path.extname(req.file.originalname).toLowerCase()] ||
      req.file.mimetype;

    const video = await Video.create({
      title: title.trim(),
      description: (description || "").trim(),
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimetype,
      size: req.file.size,
      path: req.file.filename,
    });

    res.status(201).json({
      message: "Upload video thành công!",
      video,
    });
  } catch (error) {
    // Dọn dẹp file nếu lưu DB thất bại
    if (req.file) {
      fs.unlink(req.file.path, () => {});
    }
    console.error("Upload video error:", error);
    res.status(500).json({ message: "Lỗi server khi upload video" });
  }
};

/**
 * @desc    Lấy danh sách tất cả video
 * @route   GET /api/videos
 * @access  Public
 */
const getVideos = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const [videos, total] = await Promise.all([
      Video.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
      Video.countDocuments(),
    ]);

    res.json({
      videos,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get videos error:", error);
    res.status(500).json({ message: "Lỗi server khi tải danh sách video" });
  }
};

/**
 * @desc    Lấy thông tin 1 video
 * @route   GET /api/videos/:id
 * @access  Public
 */
const getVideoById = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) {
      return res.status(404).json({ message: "Không tìm thấy video" });
    }
    res.json(video);
  } catch (error) {
    console.error("Get video error:", error);
    res.status(500).json({ message: "Lỗi server khi tải video" });
  }
};

/**
 * @desc    Xóa video (xóa cả file trên ổ đĩa)
 * @route   DELETE /api/videos/:id
 * @access  Public
 */
const deleteVideo = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) {
      return res.status(404).json({ message: "Không tìm thấy video" });
    }

    // Xóa file vật lý trên ổ đĩa
    const filePath = path.join(__dirname, "..", "uploads", video.path);
    fs.unlink(filePath, (err) => {
      if (err && err.code !== "ENOENT") {
        console.warn("Không thể xóa file video:", err.message);
      }
    });

    await Video.findByIdAndDelete(req.params.id);

    res.json({ message: "Đã xóa video thành công" });
  } catch (error) {
    console.error("Delete video error:", error);
    res.status(500).json({ message: "Lỗi server khi xóa video" });
  }
};

/**
 * @desc    Stream video file (phục vụ xem video)
 * @route   GET /api/videos/stream/:filename
 * @access  Public
 */
const streamVideo = (req, res) => {
  const filename = req.params.filename;

  // Chặn path traversal
  if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    return res.status(400).json({ message: "Tên file không hợp lệ" });
  }

  const filePath = path.join(__dirname, "..", "uploads", filename);

  // Kiểm tra file tồn tại
  fs.stat(filePath, (err, stat) => {
    if (err) {
      return res.status(404).json({ message: "Không tìm thấy file video" });
    }

    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      // Hỗ trợ Range Request (cho phép seek/tua video)
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (!match || (!match[1] && !match[2])) {
        return res.status(416).set("Content-Range", `bytes */${fileSize}`).end();
      }

      let start = match[1] ? Number.parseInt(match[1], 10) : 0;
      let end = match[2] ? Number.parseInt(match[2], 10) : fileSize - 1;
      if (!match[1]) {
        const suffixLength = Number.parseInt(match[2], 10);
        start = Math.max(fileSize - suffixLength, 0);
        end = fileSize - 1;
      }
      if (start >= fileSize || start > end || end < 0) {
        return res.status(416).set("Content-Range", `bytes */${fileSize}`).end();
      }
      end = Math.min(end, fileSize - 1);
      const chunkSize = end - start + 1;

      const mimeMap = {
        ".mp4": "video/mp4",
        ".webm": "video/webm",
        ".ogg": "video/ogg",
      };
      const ext = path.extname(filename).toLowerCase();
      const contentType = mimeMap[ext] || "video/mp4";

      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunkSize,
        "Content-Type": contentType,
      });

      fs.createReadStream(filePath, { start, end }).pipe(res);
    } else {
      // Trả về toàn bộ file
      const mimeMap = {
        ".mp4": "video/mp4",
        ".webm": "video/webm",
        ".ogg": "video/ogg",
      };
      const ext = path.extname(filename).toLowerCase();
      const contentType = mimeMap[ext] || "video/mp4";

      res.writeHead(200, {
        "Content-Length": fileSize,
        "Content-Type": contentType,
      });

      fs.createReadStream(filePath).pipe(res);
    }
  });
};

module.exports = {
  uploadVideo,
  getVideos,
  getVideoById,
  deleteVideo,
  streamVideo,
};

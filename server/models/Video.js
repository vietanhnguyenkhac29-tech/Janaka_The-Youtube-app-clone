const mongoose = require("mongoose");

/**
 * Schema cho video được upload lên server.
 * Lưu thông tin metadata và đường dẫn file trên ổ đĩa server.
 */
const videoSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Tiêu đề video là bắt buộc"],
      trim: true,
      maxlength: [200, "Tiêu đề không được vượt quá 200 ký tự"],
    },
    description: {
      type: String,
      default: "",
      maxlength: [2000, "Mô tả không được vượt quá 2000 ký tự"],
    },
    filename: {
      type: String,
      required: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    mimetype: {
      type: String,
      required: true,
      enum: ["video/mp4", "video/webm", "video/ogg"],
    },
    size: {
      type: Number,
      required: true,
    },
    // Đường dẫn tương đối trong thư mục uploads
    path: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Virtual field: chuyển đổi kích thước file sang đơn vị dễ đọc.
 */
videoSchema.virtual("sizeFormatted").get(function () {
  const bytes = this.size;
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  if (bytes < 1024 * 1024 * 1024)
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
});

// Đảm bảo virtual fields được trả về khi chuyển sang JSON
videoSchema.set("toJSON", { virtuals: true });
videoSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Video", videoSchema);


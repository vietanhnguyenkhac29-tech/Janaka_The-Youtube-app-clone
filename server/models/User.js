const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, "Vui lòng nhập tên người dùng"],
    unique: true,
  },
  email: {
    type: String,
    required: [true, "Vui lòng nhập email"],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      "Email không hợp lệ",
    ],
  },
  password: {
    type: String,
    required: [true, "Vui lòng nhập mật khẩu"],
    minlength: 6,
    select: false, // Không trả về password khi query
  },
  avatar: {
    type: String,
    default: "https://ui-avatars.com/api/?name=User&background=random",
  },
  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user",
  },
  // Data synced from Frontend
  history: [
    {
      videoId: String,
      title: String,
      thumbnail: String,
      watchedAt: { type: Date, default: Date.now },
    },
  ],
  likedVideos: [
    {
      videoId: String,
      title: String,
      thumbnail: String,
      likedAt: { type: Date, default: Date.now },
    },
  ],
  watchLater: [
    {
      videoId: String,
      title: String,
      thumbnail: String,
      addedAt: { type: Date, default: Date.now },
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Encrypt password using bcrypt
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Match user entered password to hashed password in database
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", UserSchema);

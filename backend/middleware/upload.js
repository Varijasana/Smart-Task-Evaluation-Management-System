// backend/middleware/upload.js (or wherever multer is configured)
const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

function fileFilter (req, file, cb) {
  // allow text files + existing ones
  const allowed = [
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/jpg",
    "video/mp4",
    "audio/mpeg",
    "audio/mp3",
    "text/plain"
  ];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(null, false);
  }
}

const upload = multer({ storage, fileFilter });

module.exports = upload;

const express = require("express");

const {
  createFeedback,
  getMyFeedback,
  getSessionFeedback,
  getTeacherRating
} = require("../controllers/feedbackController");

const verifyToken = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", verifyToken, createFeedback);

router.get("/my", verifyToken, getMyFeedback);

router.get(
  "/session/:sessionId",
  verifyToken,
  getSessionFeedback
);

router.get(
  "/teacher/:teacherId",
  verifyToken,
  getTeacherRating
);

module.exports = router;
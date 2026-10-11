const express = require("express");

const {
  getAllBadges,
  getMyBadges,
  getUserBadges,
  createBadge,
  awardBadge,
  getMyReputation
} = require("../controllers/badgeController");

const verifyToken = require("../middleware/authMiddleware");

const router = express.Router();

// View badges
router.get("/", verifyToken, getAllBadges);

// My badges
router.get("/my", verifyToken, getMyBadges);

// My reputation
router.get("/reputation", verifyToken, getMyReputation);

// View another user's badges
router.get("/user/:userId", verifyToken, getUserBadges);

// Create badge
router.post("/", verifyToken, createBadge);

// Award badge
router.post("/award", verifyToken, awardBadge);

module.exports = router;
const express = require("express");

const {
  getMySkills,
  addUserSkill,
  deleteUserSkill
} = require("../controllers/userSkillController");

const verifyToken = require("../middleware/authMiddleware");

const router = express.Router();

// Get logged-in user's skills
router.get("/my", verifyToken, getMySkills);

// Add skill
router.post("/", verifyToken, addUserSkill);

// Remove skill
router.delete("/:id", verifyToken, deleteUserSkill);

module.exports = router;
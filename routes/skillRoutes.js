const express = require("express");

const {
  getSkills,
  getSkillById,
  createSkill,
  updateSkill,
  deleteSkill
} = require("../controllers/skillController");

const verifyToken = require("../middleware/authMiddleware");

const router = express.Router();

// Public
router.get("/", getSkills);
router.get("/:id", getSkillById);

// Authenticated user for now
router.post("/", verifyToken, createSkill);
router.put("/:id", verifyToken, updateSkill);
router.delete("/:id", verifyToken, deleteSkill);

module.exports = router;
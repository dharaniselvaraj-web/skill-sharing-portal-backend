const express = require("express");

const {
  getSkills,
  getSkillById,
  createSkill,
  updateSkill,
  deleteSkill
} = require("../controllers/skillController");

const verifyToken = require("../middleware/authMiddleware");
const verifyAdmin = require("../middleware/adminMiddleware");

const router = express.Router();

// Read skills: authenticated users can browse the skills catalog
router.get("/", verifyToken, getSkills);
router.get("/:id", verifyToken, getSkillById);

// Create, update and delete: admin only
router.post("/", verifyToken, verifyAdmin, createSkill);
router.put("/:id", verifyToken, verifyAdmin, updateSkill);
router.delete("/:id", verifyToken, verifyAdmin, deleteSkill);

module.exports = router;
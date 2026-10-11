const express = require("express");

const {
  getSessions,
  getSessionById,
  createSession,
  updateSession,
  deleteSession
} = require("../controllers/sessionController");

const verifyToken = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", verifyToken, getSessions);

router.get("/:id", verifyToken, getSessionById);

router.post("/", verifyToken, createSession);

router.put("/:id", verifyToken, updateSession);

router.delete("/:id", verifyToken, deleteSession);

module.exports = router;
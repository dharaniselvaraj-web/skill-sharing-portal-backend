const express = require("express");

const {
  getMyNotifications,
  createNotification,
  markAsRead,
  markAllAsRead,
  deleteNotification
} = require("../controllers/notificationController");

const verifyToken = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", verifyToken, getMyNotifications);

router.post("/", verifyToken, createNotification);

router.put("/:id/read", verifyToken, markAsRead);

router.put("/read-all", verifyToken, markAllAsRead);

router.delete("/:id", verifyToken, deleteNotification);

module.exports = router;
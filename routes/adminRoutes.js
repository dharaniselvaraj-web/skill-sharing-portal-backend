const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/authMiddleware");
const { getDashboardStats } = require("../controllers/adminController");
const { getAllUsers } = require("../controllers/adminUsersController");
const {
  getAdminSessions,
  cancelAdminSession
} = require("../controllers/adminSessionController");
const {
  updateUserStatus
} = require("../controllers/adminUserStatusController");

// Check all route handlers
console.log("verifyToken:", typeof verifyToken);
console.log("getDashboardStats:", typeof getDashboardStats);
console.log("getAllUsers:", typeof getAllUsers);
console.log("getAdminSessions:", typeof getAdminSessions);
console.log("cancelAdminSession:", typeof cancelAdminSession);
console.log("updateUserStatus:", typeof updateUserStatus);

// ADMIN DASHBOARD STATISTICS
router.get("/stats", verifyToken, getDashboardStats);

// ADMIN USER MANAGEMENT
router.get("/users", verifyToken, getAllUsers);

router.put(
  "/users/:id/status",
  verifyToken,
  updateUserStatus
);

// ADMIN SESSION MANAGEMENT
router.get("/sessions", verifyToken, getAdminSessions);

router.put(
  "/sessions/:id/cancel",
  verifyToken,
  cancelAdminSession
);

module.exports = router;
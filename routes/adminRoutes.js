
const express = require("express");
const router = express.Router();

const verifyToken = require("../middleware/authMiddleware");
const verifyAdmin = require("../middleware/adminMiddleware");
const { connectDB } = require("../database/db");

const { getDashboardStats } = require("../controllers/adminController");
const { getAllUsers } = require("../controllers/adminUsersController");

const {
  getAdminSessions,
  cancelAdminSession
} = require("../controllers/adminSessionController");

const { updateUserStatus } = require("../controllers/adminUserStatusController");

const {
  getAllAdminFeedback,
  deleteAdminFeedback
} = require("../controllers/adminFeedbackController");

const { getAdminAnalytics } = require("../controllers/adminAnalyticsController");

const {
  getAdminNotifications,
  deleteAdminNotification,
  markAdminNotificationRead,
  markAllAdminNotificationsRead
} = require("../controllers/adminNotificationController");

const { getAdminSettings } = require("../controllers/adminSettingsController");
const { getAdminActivities } = require("../controllers/adminActivityController");

// ======================================
// CHECK ADMIN ACCOUNT
// GET /api/admin/check-admin
// ======================================

router.get("/check-admin", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const pool = await connectDB();

    const result = await pool.request().query(`
      SELECT UserID, Name, Email, Role, Status
      FROM dbo.Users
      WHERE LOWER(Role) = 'admin'
      ORDER BY UserID
    `);

    return res.status(200).json({
      adminExists: result.recordset.length > 0,
      count: result.recordset.length,
      admins: result.recordset
    });
  } catch (error) {
    console.error("Check admin error:", error.message);
    return res.status(500).json({
      message: "Failed to check admin account."
    });
  }
});

// ======================================
// ADMIN DASHBOARD
// ======================================

router.get("/stats", verifyToken, verifyAdmin, getDashboardStats);

router.get("/user-roles", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const pool = await connectDB();

    const result = await pool.request().query(`
      SELECT UserID, Name, Email, Role, Status
      FROM dbo.Users
      ORDER BY UserID
    `);

    return res.status(200).json({
      totalUsers: result.recordset.length,
      users: result.recordset
    });
  } catch (error) {
    console.error("User roles error:", error.message);
    return res.status(500).json({
      message: "Failed to retrieve user roles."
    });
  }
});

// ======================================
// USER MANAGEMENT
// ======================================

router.get("/users", verifyToken, verifyAdmin, getAllUsers);

router.put(
  "/users/:id/status",
  verifyToken,
  verifyAdmin,
  updateUserStatus
);

// ======================================
// SESSION MANAGEMENT
// ======================================

router.get("/sessions", verifyToken, verifyAdmin, getAdminSessions);

router.put(
  "/sessions/:id/cancel",
  verifyToken,
  verifyAdmin,
  cancelAdminSession
);

// ======================================
// FEEDBACK MANAGEMENT
// ======================================

router.get("/feedback", verifyToken, verifyAdmin, getAllAdminFeedback);

router.delete(
  "/feedback/:id",
  verifyToken,
  verifyAdmin,
  deleteAdminFeedback
);

// ======================================
// ANALYTICS
// ======================================

router.get("/analytics", verifyToken, verifyAdmin, getAdminAnalytics);

// ======================================
// ADMIN NOTIFICATIONS
// ======================================

// GET all notifications
router.get(
  "/notifications",
  verifyToken,
  verifyAdmin,
  getAdminNotifications
);

// Mark one notification as read
router.put(
  "/notifications/:id/read",
  verifyToken,
  verifyAdmin,
  markAdminNotificationRead
);

// Mark all notifications as read
router.put(
  "/notifications/read-all",
  verifyToken,
  verifyAdmin,
  markAllAdminNotificationsRead
);

// Delete one notification
router.delete(
  "/notifications/:id",
  verifyToken,
  verifyAdmin,
  deleteAdminNotification
);

// ======================================
// SETTINGS
// ======================================

router.get("/settings", verifyToken, verifyAdmin, getAdminSettings);

// ======================================
// ADMIN ACTIVITIES
// ======================================

router.get("/activities", verifyToken, verifyAdmin, getAdminActivities);

module.exports = router;
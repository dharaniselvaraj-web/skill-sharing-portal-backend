
const { sql, connectDB } = require("../database/db");

// ======================================
// GET ALL NOTIFICATIONS FOR ADMIN
// GET /api/admin/notifications
// ======================================

const getAdminNotifications = async (req, res) => {
  try {
    if (
      !req.user ||
      String(req.user.role || "").toLowerCase() !== "admin"
    ) {
      return res.status(403).json({
        message: "Admin access required."
      });
    }

    const pool = await connectDB();

    const result = await pool.request().query(`
      SELECT
        n.NotificationID,
        n.UserID,
        u.Name AS UserName,
        u.Email AS UserEmail,
        n.Title,
        n.Message,
        n.Type,
        n.IsRead,
        n.CreatedAt
      FROM dbo.Notifications n
      LEFT JOIN dbo.Users u
        ON u.UserID = n.UserID
      ORDER BY n.CreatedAt DESC, n.NotificationID DESC
    `);

    const notifications = result.recordset;

    const total = notifications.length;
    const read = notifications.filter(
      (item) =>
        item.IsRead === true ||
        item.IsRead === 1
    ).length;

    const unread = total - read;

    return res.status(200).json({
      total,
      read,
      unread,
      notifications
    });
  } catch (error) {
    console.error("Get admin notifications error:", error);

    return res.status(500).json({
      message: "Failed to load notifications."
    });
  }
};

/* ======================================
   MARK NOTIFICATION AS READ
   PUT /api/admin/notifications/:id/read
====================================== */

const markAdminNotificationRead = async (req, res) => {
  try {
    if (
      !req.user ||
      String(req.user.role || "").toLowerCase() !== "admin"
    ) {
      return res.status(403).json({
        message: "Admin access required."
      });
    }

    const notificationId = Number(req.params.id);

    if (
      !Number.isInteger(notificationId) ||
      notificationId <= 0
    ) {
      return res.status(400).json({
        message: "Invalid notification ID."
      });
    }

    const pool = await connectDB();

    const result = await pool
      .request()
      .input("NotificationID", sql.Int, notificationId)
      .query(`
        UPDATE dbo.Notifications
        SET IsRead = 1
        WHERE NotificationID = @NotificationID
          AND (IsRead = 0 OR IsRead IS NULL);

        SELECT @@ROWCOUNT AS UpdatedCount;
      `);

    const updatedCount =
      result.recordsets[result.recordsets.length - 1][0].UpdatedCount;

    if (updatedCount === 0) {
      const existing = await pool
        .request()
        .input("NotificationID", sql.Int, notificationId)
        .query(`
          SELECT NotificationID, IsRead
          FROM dbo.Notifications
          WHERE NotificationID = @NotificationID
        `);

      if (existing.recordset.length === 0) {
        return res.status(404).json({
          message: "Notification not found."
        });
      }

      return res.status(200).json({
        message: "Notification is already read."
      });
    }

    return res.status(200).json({
      message: "Notification marked as read."
    });
  } catch (error) {
    console.error("Mark notification as read error:", error);

    return res.status(500).json({
      message: "Failed to mark notification as read."
    });
  }
};

// ======================================
// DELETE A NOTIFICATION
// DELETE /api/admin/notifications/:id
// ======================================

const deleteAdminNotification = async (req, res) => {
  try {
    if (
      !req.user ||
      String(req.user.role || "").toLowerCase() !== "admin"
    ) {
      return res.status(403).json({
        message: "Admin access required."
      });
    }

    const notificationId = Number(req.params.id);

    if (
      !Number.isInteger(notificationId) ||
      notificationId <= 0
    ) {
      return res.status(400).json({
        message: "Invalid notification ID."
      });
    }

    const pool = await connectDB();

    const result = await pool
      .request()
      .input("NotificationID", sql.Int, notificationId)
      .query(`
        DELETE FROM dbo.Notifications
        WHERE NotificationID = @NotificationID;

        SELECT @@ROWCOUNT AS DeletedCount;
      `);

    const deletedCount =
      result.recordsets[result.recordsets.length - 1][0]
        .DeletedCount;

    if (deletedCount === 0) {
      return res.status(404).json({
        message: "Notification not found."
      });
    }

    return res.status(200).json({
      message: "Notification deleted successfully."
    });
  } catch (error) {
    console.error("Delete admin notification error:", error);

    return res.status(500).json({
      message: "Failed to delete notification."
    });
  }
};

// MARK ALL NOTIFICATIONS AS READ

const markAllAdminNotificationsRead = async (req, res) => {
  try {
    if (
      !req.user ||
      String(req.user.role || "").toLowerCase() !== "admin"
    ) {
      return res.status(403).json({
        message: "Admin access required."
      });
    }

    const pool = await connectDB();

    const result = await pool.request().query(`
      UPDATE dbo.Notifications
      SET IsRead = 1
      WHERE IsRead = 0 OR IsRead IS NULL
    `);

    return res.status(200).json({
      message: "All notifications marked as read.",
      updatedCount: result.rowsAffected[0]
    });
  } catch (error) {
    console.error("Mark all notifications as read error:", error);

    return res.status(500).json({
      message: "Failed to mark all notifications as read."
    });
  }
};

module.exports = {
  getAdminNotifications,
  deleteAdminNotification,
  markAdminNotificationRead,
  markAllAdminNotificationsRead
};

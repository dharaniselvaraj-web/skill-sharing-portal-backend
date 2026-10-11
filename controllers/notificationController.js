const { sql, connectDB } = require("../database/db");

// ==========================================
// INTERNAL CREATE NOTIFICATION HELPER
// ==========================================
// Used by other controllers such as enrollmentController
const sendNotification = async (
  userId,
  title,
  message,
  type = "General"
) => {
  try {
    if (!userId || !title || !message) {
      console.error(
        "Notification requires userId, title and message."
      );
      return null;
    }

    const pool = await connectDB();

    const result = await pool
      .request()
      .input("userId", sql.Int, userId)
      .input("title", sql.NVarChar(200), title)
      .input("message", sql.NVarChar(1000), message)
      .input("type", sql.NVarChar(50), type)
      .query(`
        INSERT INTO Notifications
        (
          UserID,
          Title,
          Message,
          Type,
          IsRead
        )

        OUTPUT
          INSERTED.NotificationID,
          INSERTED.UserID,
          INSERTED.Title,
          INSERTED.Message,
          INSERTED.Type,
          INSERTED.IsRead,
          INSERTED.CreatedAt

        VALUES
        (
          @userId,
          @title,
          @message,
          @type,
          0
        )
      `);

    return result.recordset[0];

  } catch (error) {
    console.error("Send notification error:");
    console.error(error.message);

    return null;
  }
};


// ==========================================
// GET MY NOTIFICATIONS
// ==========================================
const getMyNotifications = async (req, res) => {
  try {
    const pool = await connectDB();

    const result = await pool
      .request()
      .input("userId", sql.Int, req.user.userId)
      .query(`
        SELECT
          NotificationID,
          UserID,
          Title,
          Message,
          Type,
          IsRead,
          CreatedAt
        FROM Notifications
        WHERE UserID = @userId
        ORDER BY CreatedAt DESC
      `);

    return res.status(200).json({
      notifications: result.recordset
    });

  } catch (error) {
    console.error("Get notifications error:");
    console.error(error.message);

    return res.status(500).json({
      message: "Server error while fetching notifications."
    });
  }
};


// ==========================================
// CREATE NOTIFICATION API
// ==========================================
const createNotification = async (req, res) => {
  try {
    const {
      userId,
      title,
      message,
      type
    } = req.body;

    if (!userId || !title || !message) {
      return res.status(400).json({
        message: "User ID, title and message are required."
      });
    }

    const notification = await sendNotification(
      userId,
      title,
      message,
      type || "General"
    );

    if (!notification) {
      return res.status(500).json({
        message: "Unable to create notification."
      });
    }

    return res.status(201).json({
      message: "Notification created successfully!",
      notification
    });

  } catch (error) {
    console.error("Create notification error:");
    console.error(error.message);

    return res.status(500).json({
      message: "Server error while creating notification."
    });
  }
};


// ==========================================
// MARK ONE NOTIFICATION AS READ
// ==========================================
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const pool = await connectDB();

    const result = await pool
      .request()
      .input("notificationId", sql.Int, id)
      .input("userId", sql.Int, req.user.userId)
      .query(`
        UPDATE Notifications
        SET IsRead = 1
        OUTPUT
          INSERTED.NotificationID,
          INSERTED.IsRead
        WHERE NotificationID = @notificationId
          AND UserID = @userId
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({
        message: "Notification not found."
      });
    }

    return res.status(200).json({
      message: "Notification marked as read.",
      notification: result.recordset[0]
    });

  } catch (error) {
    console.error("Mark notification error:");
    console.error(error.message);

    return res.status(500).json({
      message: "Server error while updating notification."
    });
  }
};


// ==========================================
// MARK ALL AS READ
// ==========================================
const markAllAsRead = async (req, res) => {
  try {
    const pool = await connectDB();

    await pool
      .request()
      .input("userId", sql.Int, req.user.userId)
      .query(`
        UPDATE Notifications
        SET IsRead = 1
        WHERE UserID = @userId
          AND IsRead = 0
      `);

    return res.status(200).json({
      message: "All notifications marked as read."
    });

  } catch (error) {
    console.error("Mark all notifications error:");
    console.error(error.message);

    return res.status(500).json({
      message: "Server error while updating notifications."
    });
  }
};


// ==========================================
// DELETE NOTIFICATION
// ==========================================
const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;

    const pool = await connectDB();

    const result = await pool
      .request()
      .input("notificationId", sql.Int, id)
      .input("userId", sql.Int, req.user.userId)
      .query(`
        DELETE FROM Notifications
        OUTPUT DELETED.NotificationID
        WHERE NotificationID = @notificationId
          AND UserID = @userId
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({
        message: "Notification not found."
      });
    }

    return res.status(200).json({
      message: "Notification deleted successfully!"
    });

  } catch (error) {
    console.error("Delete notification error:");
    console.error(error.message);

    return res.status(500).json({
      message: "Server error while deleting notification."
    });
  }
};


module.exports = {
  sendNotification,
  getMyNotifications,
  createNotification,
  markAsRead,
  markAllAsRead,
  deleteNotification
};
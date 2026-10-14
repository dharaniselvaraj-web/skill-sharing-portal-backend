
const { sql, connectDB } = require("../database/db");
const { sendNotification } = require("../utils/notificationService");
const {
  createAdminActivity
} = require("./adminActivityController");

// GET ALL SESSIONS FOR ADMIN
const getAdminSessions = async (req, res) => {
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
        s.SessionID,
        s.Title,
        s.Description,
        s.SessionDate,
        s.StartTime,
        s.EndTime,
        s.Status,
        s.TeacherID,
        u.Name AS TeacherName,
        sk.SkillName,
        s.MaxParticipants,
        (
          SELECT COUNT(*)
          FROM dbo.Enrollments e
          WHERE e.SessionID = s.SessionID
            AND e.Status IN ('Pending', 'Accepted')
        ) AS EnrolledCount
      FROM dbo.Sessions s
      LEFT JOIN dbo.Users u
        ON u.UserID = s.TeacherID
      LEFT JOIN dbo.Skills sk
        ON sk.SkillID = s.SkillID
      ORDER BY s.SessionID DESC
    `);

    return res.status(200).json(result.recordset);
  } catch (error) {
    console.error("Get admin sessions error:", error);

    return res.status(500).json({
      message: "Failed to fetch sessions."
    });
  }
};

// CANCEL SESSION (ADMIN ONLY)
const cancelAdminSession = async (req, res) => {
  try {
    if (
      !req.user ||
      String(req.user.role || "").toLowerCase() !== "admin"
    ) {
      return res.status(403).json({
        message: "Admin access required."
      });
    }

    const sessionId = Number(req.params.id);

    if (!Number.isInteger(sessionId) || sessionId <= 0) {
      return res.status(400).json({
        message: "Invalid session ID."
      });
    }

    const pool = await connectDB();

    const sessionResult = await pool.request()
      .input("SessionID", sql.Int, sessionId)
      .query(`
        SELECT SessionID, Title, Status
        FROM dbo.Sessions
        WHERE SessionID = @SessionID
      `);

    if (sessionResult.recordset.length === 0) {
      return res.status(404).json({
        message: "Session not found."
      });
    }

    const session = sessionResult.recordset[0];
    const currentStatus = String(
      session.Status || ""
    ).toLowerCase();

    if (
      ["cancelled", "completed", "closed"].includes(currentStatus)
    ) {
      return res.status(400).json({
        message: `This session is already ${session.Status} and cannot be cancelled.`
      });
    }

    // Cancel the session
    await pool.request()
      .input("SessionID", sql.Int, sessionId)
      .query(`
        UPDATE dbo.Sessions
        SET Status = 'Cancelled'
        WHERE SessionID = @SessionID
      `);

    // Get students who need notifications
    const affectedResult = await pool.request()
      .input("SessionID", sql.Int, sessionId)
      .query(`
        SELECT StudentID
        FROM dbo.Enrollments
        WHERE SessionID = @SessionID
          AND Status IN ('Pending', 'Accepted')
      `);

    // Cancel related enrollments
    await pool.request()
      .input("SessionID", sql.Int, sessionId)
      .query(`
        UPDATE dbo.Enrollments
        SET Status = 'Cancelled'
        WHERE SessionID = @SessionID
          AND Status IN ('Pending', 'Accepted')
      `);

    // Record admin activity
    try {
      const adminId = Number(req.user.id);

      if (Number.isInteger(adminId) && adminId > 0) {
        await createAdminActivity(
          adminId,
          "SESSION_CANCELLED",
          `Admin cancelled session "${session.Title}" (ID: ${sessionId}).`
        );
      } else {
        console.error(
          "Activity log skipped: valid admin ID not found in req.user.id."
        );
      }
    } catch (logError) {
      // Cancellation has already succeeded.
      console.error(
        "Failed to save session cancellation activity:",
        logError.message
      );
    }

    // Notify affected students
    for (const row of affectedResult.recordset) {
      try {
        await sendNotification(
          row.StudentID,
          "Session Cancelled",
          `The session "${session.Title}" has been cancelled by the administrator.`,
          "Session"
        );
      } catch (notificationError) {
        console.error(
          "Failed to notify student:",
          row.StudentID,
          notificationError.message
        );
      }
    }

    return res.status(200).json({
      message: "Session cancelled successfully."
    });
  } catch (error) {
    console.error("Cancel admin session error:", error);

    return res.status(500).json({
      message: "Failed to cancel session."
    });
  }
};

module.exports = {
  getAdminSessions,
  cancelAdminSession
};

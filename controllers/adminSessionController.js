
const { sql, connectDB } = require("../database/db");
const { sendNotification } = require("../utils/notificationService");

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
          FROM Enrollments e
          WHERE e.SessionID = s.SessionID
            AND e.Status IN ('Pending', 'Accepted')
        ) AS EnrolledCount
      FROM Sessions s
      LEFT JOIN Users u ON u.UserID = s.TeacherID
      LEFT JOIN Skills sk ON sk.SkillID = s.SkillID
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
        FROM Sessions
        WHERE SessionID = @SessionID
      `);

    if (sessionResult.recordset.length === 0) {
      return res.status(404).json({
        message: "Session not found."
      });
    }

    const session = sessionResult.recordset[0];
    const currentStatus = String(session.Status || "").toLowerCase();

    if (["cancelled", "completed", "closed"].includes(currentStatus)) {
      return res.status(400).json({
        message: `This session is already ${session.Status} and cannot be cancelled.`
      });
    }

    await pool.request()
      .input("SessionID", sql.Int, sessionId)
      .query(`
        UPDATE Sessions
        SET Status = 'Cancelled'
        WHERE SessionID = @SessionID
      `);

    const affectedResult = await pool.request()
      .input("SessionID", sql.Int, sessionId)
      .query(`
        SELECT StudentID
        FROM Enrollments
        WHERE SessionID = @SessionID
          AND Status IN ('Pending', 'Accepted')
      `);

    await pool.request()
      .input("SessionID", sql.Int, sessionId)
      .query(`
        UPDATE Enrollments
        SET Status = 'Cancelled'
        WHERE SessionID = @SessionID
          AND Status IN ('Pending', 'Accepted')
      `);

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
          notificationError
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
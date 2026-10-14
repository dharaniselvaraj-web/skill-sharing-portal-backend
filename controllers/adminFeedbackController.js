
const { sql, connectDB } = require("../database/db");
const {
  createAdminActivity
} = require("./adminActivityController");

// GET ALL FEEDBACK FOR ADMIN
const getAllAdminFeedback = async (req, res) => {
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
        f.FeedbackID,
        f.EnrollmentID,
        f.StudentID,
        student.Name AS StudentName,
        f.SessionID,
        s.Title AS SessionTitle,
        teacher.Name AS TeacherName,
        sk.SkillName,
        f.Rating,
        f.Comment,
        f.CreatedAt
      FROM dbo.Feedback f
      LEFT JOIN dbo.Users student
        ON f.StudentID = student.UserID
      LEFT JOIN dbo.Sessions s
        ON f.SessionID = s.SessionID
      LEFT JOIN dbo.Users teacher
        ON s.TeacherID = teacher.UserID
      LEFT JOIN dbo.Skills sk
        ON s.SkillID = sk.SkillID
      ORDER BY f.CreatedAt DESC, f.FeedbackID DESC
    `);

    return res.status(200).json({
      feedback: result.recordset
    });
  } catch (error) {
    console.error("Get admin feedback error:", error);

    return res.status(500).json({
      message: "Failed to fetch feedback."
    });
  }
};

// DELETE FEEDBACK (ADMIN ONLY)
const deleteAdminFeedback = async (req, res) => {
  try {
    if (
      !req.user ||
      String(req.user.role || "").toLowerCase() !== "admin"
    ) {
      return res.status(403).json({
        message: "Admin access required."
      });
    }

    const feedbackId = Number(req.params.id);

    if (!Number.isInteger(feedbackId) || feedbackId <= 0) {
      return res.status(400).json({
        message: "Invalid feedback ID."
      });
    }

    const pool = await connectDB();

    // Fetch feedback details before deleting
    const feedbackResult = await pool.request()
      .input("FeedbackID", sql.Int, feedbackId)
      .query(`
        SELECT
          f.FeedbackID,
          f.StudentID,
          f.SessionID,
          s.Title AS SessionTitle
        FROM dbo.Feedback f
        LEFT JOIN dbo.Sessions s
          ON s.SessionID = f.SessionID
        WHERE f.FeedbackID = @FeedbackID
      `);

    if (feedbackResult.recordset.length === 0) {
      return res.status(404).json({
        message: "Feedback not found."
      });
    }

    const feedback = feedbackResult.recordset[0];

    // Delete feedback
    const result = await pool.request()
      .input("FeedbackID", sql.Int, feedbackId)
      .query(`
        DELETE FROM dbo.Feedback
        WHERE FeedbackID = @FeedbackID;

        SELECT @@ROWCOUNT AS DeletedCount;
      `);

    if (
      !result.recordset ||
      result.recordset[0].DeletedCount === 0
    ) {
      return res.status(404).json({
        message: "Feedback not found."
      });
    }

    // Save activity after successful deletion
    try {
      const adminId = Number(req.user.id);

      if (Number.isInteger(adminId) && adminId > 0) {
        const sessionTitle =
          feedback.SessionTitle || "Unknown session";

        await createAdminActivity(
          adminId,
          "FEEDBACK_DELETED",
          `Admin deleted feedback ID ${feedbackId} for session "${sessionTitle}" (Student ID: ${feedback.StudentID}).`
        );
      } else {
        console.error(
          "Activity log skipped: valid admin ID not found in req.user.id."
        );
      }
    } catch (logError) {
      // Feedback deletion has already succeeded.
      console.error(
        "Failed to save feedback deletion activity:",
        logError.message
      );
    }

    return res.status(200).json({
      message: "Feedback deleted successfully.",
      feedbackId
    });
  } catch (error) {
    console.error("Delete admin feedback error:", error);

    return res.status(500).json({
      message: "Failed to delete feedback."
    });
  }
};

module.exports = {
  getAllAdminFeedback,
  deleteAdminFeedback
};

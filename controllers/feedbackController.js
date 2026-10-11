const { sql, connectDB } = require("../database/db");

// ==========================================
// CREATE FEEDBACK
// ==========================================
const createFeedback = async (req, res) => {
  try {
    const {
      enrollmentId,
      rating,
      comment
    } = req.body;

    if (!enrollmentId || !rating) {
      return res.status(400).json({
        message: "Enrollment ID and rating are required."
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        message: "Rating must be between 1 and 5."
      });
    }

    const pool = await connectDB();

    // Check enrollment
    const enrollmentResult = await pool
      .request()
      .input("enrollmentId", sql.Int, enrollmentId)
      .input("studentId", sql.Int, req.user.userId)
      .query(`
        SELECT
          e.EnrollmentID,
          e.SessionID,
          e.StudentID,
          e.Status
        FROM Enrollments e
        WHERE e.EnrollmentID = @enrollmentId
          AND e.StudentID = @studentId
      `);

    if (enrollmentResult.recordset.length === 0) {
      return res.status(404).json({
        message: "Enrollment not found."
      });
    }

    const enrollment = enrollmentResult.recordset[0];

    // Only accepted enrollment can give feedback
    if (enrollment.Status !== "Accepted") {
      return res.status(400).json({
        message: "Feedback can be given only for an accepted enrollment."
      });
    }

    // Check duplicate feedback
    const existingFeedback = await pool
      .request()
      .input("enrollmentId", sql.Int, enrollmentId)
      .query(`
        SELECT FeedbackID
        FROM Feedback
        WHERE EnrollmentID = @enrollmentId
      `);

    if (existingFeedback.recordset.length > 0) {
      return res.status(409).json({
        message: "Feedback has already been submitted for this enrollment."
      });
    }

    // Insert feedback
    const result = await pool
      .request()
      .input("enrollmentId", sql.Int, enrollmentId)
      .input("studentId", sql.Int, req.user.userId)
      .input("sessionId", sql.Int, enrollment.SessionID)
      .input("rating", sql.Int, rating)
      .input(
        "comment",
        sql.NVarChar(1000),
        comment || null
      )
      .query(`
        INSERT INTO Feedback
        (
          EnrollmentID,
          StudentID,
          SessionID,
          Rating,
          Comment
        )

        OUTPUT
          INSERTED.FeedbackID,
          INSERTED.EnrollmentID,
          INSERTED.StudentID,
          INSERTED.SessionID,
          INSERTED.Rating,
          INSERTED.Comment,
          INSERTED.CreatedAt

        VALUES
        (
          @enrollmentId,
          @studentId,
          @sessionId,
          @rating,
          @comment
        )
      `);

    return res.status(201).json({
      message: "Feedback submitted successfully!",
      feedback: result.recordset[0]
    });

  } catch (error) {
    console.error("Create feedback error:");
    console.error(error.message);

    return res.status(500).json({
      message: "Server error while submitting feedback."
    });
  }
};


// ==========================================
// GET MY FEEDBACK
// ==========================================
const getMyFeedback = async (req, res) => {
  try {
    const pool = await connectDB();

    const result = await pool
      .request()
      .input("studentId", sql.Int, req.user.userId)
      .query(`
        SELECT
          f.FeedbackID,
          f.EnrollmentID,
          f.SessionID,
          f.Rating,
          f.Comment,
          f.CreatedAt,

          s.Title,
          sk.SkillName,

          u.Name AS TeacherName

        FROM Feedback f

        INNER JOIN Sessions s
          ON f.SessionID = s.SessionID

        INNER JOIN Skills sk
          ON s.SkillID = sk.SkillID

        INNER JOIN Users u
          ON s.TeacherID = u.UserID

        WHERE f.StudentID = @studentId

        ORDER BY f.CreatedAt DESC
      `);

    return res.status(200).json({
      feedback: result.recordset
    });

  } catch (error) {
    console.error("Get my feedback error:");
    console.error(error.message);

    return res.status(500).json({
      message: "Server error while fetching feedback."
    });
  }
};


// ==========================================
// GET SESSION FEEDBACK
// ==========================================
const getSessionFeedback = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const pool = await connectDB();

    const result = await pool
      .request()
      .input("sessionId", sql.Int, sessionId)
      .query(`
        SELECT
          f.FeedbackID,
          f.Rating,
          f.Comment,
          f.CreatedAt,

          u.UserID AS StudentID,
          u.Name AS StudentName

        FROM Feedback f

        INNER JOIN Users u
          ON f.StudentID = u.UserID

        WHERE f.SessionID = @sessionId

        ORDER BY f.CreatedAt DESC
      `);

    return res.status(200).json({
      feedback: result.recordset
    });

  } catch (error) {
    console.error("Get session feedback error:");
    console.error(error.message);

    return res.status(500).json({
      message: "Server error while fetching session feedback."
    });
  }
};


// ==========================================
// GET TEACHER RATING
// ==========================================
const getTeacherRating = async (req, res) => {
  try {
    const { teacherId } = req.params;

    const pool = await connectDB();

    const result = await pool
      .request()
      .input("teacherId", sql.Int, teacherId)
      .query(`
        SELECT
          COUNT(f.FeedbackID) AS TotalReviews,
          ISNULL(AVG(CAST(f.Rating AS DECIMAL(10,2))), 0) AS AverageRating
        FROM Feedback f

        INNER JOIN Sessions s
          ON f.SessionID = s.SessionID

        WHERE s.TeacherID = @teacherId
      `);

    return res.status(200).json({
      teacherId: Number(teacherId),
      totalReviews: result.recordset[0].TotalReviews,
      averageRating: result.recordset[0].AverageRating
    });

  } catch (error) {
    console.error("Get teacher rating error:");
    console.error(error.message);

    return res.status(500).json({
      message: "Server error while calculating teacher rating."
    });
  }
};


module.exports = {
  createFeedback,
  getMyFeedback,
  getSessionFeedback,
  getTeacherRating
};
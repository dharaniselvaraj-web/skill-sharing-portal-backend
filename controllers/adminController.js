
const { connectDB } = require("../database/db");

// ======================================
// GET ADMIN DASHBOARD STATISTICS
// GET /api/admin/stats
// ======================================

const getDashboardStats = async (req, res) => {
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
        (SELECT COUNT(*) FROM dbo.Users) AS TotalUsers,
        (SELECT COUNT(*) FROM dbo.Skills) AS TotalSkills,
        (SELECT COUNT(*) FROM dbo.Sessions) AS TotalSessions,
        (SELECT COUNT(*) FROM dbo.Enrollments) AS TotalEnrollments
    `);

    const stats = result.recordset[0];

    return res.status(200).json({
      totalUsers: Number(stats.TotalUsers),
      totalSkills: Number(stats.TotalSkills),
      totalSessions: Number(stats.TotalSessions),
      totalEnrollments: Number(stats.TotalEnrollments)
    });
  } catch (error) {
    console.error("Admin dashboard stats error:", error);

    return res.status(500).json({
      message: "Failed to load admin dashboard statistics."
    });
  }
};

// ======================================
// GET ADMIN REPORT DATA
// GET /api/admin/reports/:type
// ======================================

const getAdminReport = async (req, res) => {
  try {
    if (
      !req.user ||
      String(req.user.role || "").toLowerCase() !== "admin"
    ) {
      return res.status(403).json({
        message: "Admin access required."
      });
    }

    const reportType = String(req.params.type || "").toLowerCase();

    const reportQueries = {
      users: `
        SELECT
          UserID,
          Name,
          Email,
          Role,
          Status,
          IsActive,
          CreatedAt
        FROM dbo.Users
        ORDER BY UserID DESC
      `,

      skills: `
        SELECT
          SkillID,
          SkillName,
          Description,
          CreatedAt
        FROM dbo.Skills
        ORDER BY SkillID DESC
      `,

      sessions: `
        SELECT
          s.SessionID,
          s.Title,
          s.Description,
          s.SessionDate,
          s.StartTime,
          s.EndTime,
          s.Status,
          u.Name AS TeacherName,
          sk.SkillName,
          s.MaxParticipants
        FROM dbo.Sessions s
        LEFT JOIN dbo.Users u
          ON u.UserID = s.TeacherID
        LEFT JOIN dbo.Skills sk
          ON sk.SkillID = s.SkillID
        ORDER BY s.SessionID DESC
      `,

      enrollments: `
        SELECT
          e.EnrollmentID,
          e.SessionID,
          s.Title AS SessionTitle,
          u.Name AS StudentName,
          e.Status
        FROM dbo.Enrollments e
        LEFT JOIN dbo.Sessions s
          ON s.SessionID = e.SessionID
        LEFT JOIN dbo.Users u
          ON u.UserID = e.StudentID
        ORDER BY e.EnrollmentID DESC
      `
    };

    if (!Object.prototype.hasOwnProperty.call(reportQueries, reportType)) {
      return res.status(400).json({
        message: "Invalid report type. Use users, skills, sessions or enrollments."
      });
    }

    const pool = await connectDB();
    const result = await pool.request().query(reportQueries[reportType]);

    return res.status(200).json({
      reportType,
      total: result.recordset.length,
      rows: result.recordset
    });
  } catch (error) {
    console.error("Admin report error:", error);

    return res.status(500).json({
      message: "Failed to generate report. Check the database column names."
    });
  }
};

module.exports = {
  getDashboardStats,
  getAdminReport
};

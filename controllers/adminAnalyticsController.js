
const { connectDB } = require("../database/db");

// ======================================
// GET ADMIN ANALYTICS REPORTS
// GET /api/admin/analytics
// ======================================

const getAdminAnalytics = async (req, res) => {
  try {
    // Check admin access
    if (
      !req.user ||
      String(req.user.role || "").toLowerCase() !== "admin"
    ) {
      return res.status(403).json({
        message: "Admin access required."
      });
    }

    const pool = await connectDB();

    // 1. Enrollments grouped by status
    const enrollmentResult = await pool.request().query(`
      SELECT
        COALESCE(Status, 'Unknown') AS Status,
        COUNT(*) AS Total
      FROM dbo.Enrollments
      GROUP BY Status
      ORDER BY Total DESC
    `);

    // 2. Sessions grouped by status
    const sessionResult = await pool.request().query(`
      SELECT
        COALESCE(Status, 'Unknown') AS Status,
        COUNT(*) AS Total
      FROM dbo.Sessions
      GROUP BY Status
      ORDER BY Total DESC
    `);

    // 3. Top 5 popular skills by pending and accepted enrollments
    const popularSkillsResult = await pool.request().query(`
      SELECT TOP 5
        sk.SkillName,
        COUNT(e.EnrollmentID) AS EnrollmentCount
      FROM dbo.Skills sk
      INNER JOIN dbo.Sessions s
        ON s.SkillID = sk.SkillID
      INNER JOIN dbo.Enrollments e
        ON e.SessionID = s.SessionID
      WHERE e.Status IN ('Pending', 'Accepted')
      GROUP BY sk.SkillID, sk.SkillName
      ORDER BY
        COUNT(e.EnrollmentID) DESC,
        sk.SkillName ASC
    `);

    return res.status(200).json({
      enrollmentsByStatus: enrollmentResult.recordset,
      sessionsByStatus: sessionResult.recordset,
      popularSkills: popularSkillsResult.recordset
    });
  } catch (error) {
    console.error("Admin analytics error:", error);

    return res.status(500).json({
      message: "Failed to load analytics reports."
    });
  }
};

module.exports = {
  getAdminAnalytics
};

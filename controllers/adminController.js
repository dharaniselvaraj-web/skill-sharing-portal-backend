
const { connectDB } = require("../database/db");

// GET ADMIN DASHBOARD STATISTICS
const getDashboardStats = async (req, res) => {
  try {
    // Only admins can access these statistics
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
        (SELECT COUNT(*) FROM Users) AS TotalUsers,
        (SELECT COUNT(*) FROM Skills) AS TotalSkills,
        (SELECT COUNT(*) FROM Sessions) AS TotalSessions,
        (SELECT COUNT(*) FROM Enrollments) AS TotalEnrollments
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

module.exports = { getDashboardStats };
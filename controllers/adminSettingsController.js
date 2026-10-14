
const { connectDB } = require("../database/db");

// GET ADMIN SYSTEM SETTINGS
const getAdminSettings = async (req, res) => {
  try {
    // Verify admin role
    if (
      !req.user ||
      String(req.user.role || "").toLowerCase() !== "admin"
    ) {
      return res.status(403).json({
        message: "Admin access required."
      });
    }

    // Check database connection
    const pool = await connectDB();

    // Get database information
    const dbResult = await pool.request().query(`
      SELECT
        DB_NAME() AS DatabaseName,
        @@VERSION AS SQLServerVersion
    `);

    // Get system statistics
    const statsResult = await pool.request().query(`
      SELECT
        (SELECT COUNT(*) FROM dbo.Users) AS TotalUsers,
        (SELECT COUNT(*) FROM dbo.Skills) AS TotalSkills,
        (SELECT COUNT(*) FROM dbo.Sessions) AS TotalSessions,
        (SELECT COUNT(*) FROM dbo.Enrollments) AS TotalEnrollments
    `);

    const database = dbResult.recordset[0];
    const stats = statsResult.recordset[0];

    return res.status(200).json({
      success: true,
      system: {
        applicationName: "Skill Sharing Portal",
        applicationType: "MCA Mini Project",
        backend: "Node.js + Express",
        frontend: "React.js",
        databaseType: "Microsoft SQL Server",
        databaseName: database.DatabaseName,
        databaseStatus: "Connected",
        serverVersion: database.SQLServerVersion
          .split("\n")[0]
      },
      statistics: stats,
      checkedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("Admin settings error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to load system settings.",
      databaseStatus: "Connection failed"
    });
  }
};

module.exports = {
  getAdminSettings
};

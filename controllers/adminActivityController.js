
const { sql, connectDB } = require("../database/db");

// GET ADMIN ACTIVITY LOGS
const getAdminActivities = async (req, res) => {
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
      SELECT TOP 200
        a.LogID,
        a.AdminID,
        u.Name AS AdminName,
        a.Action,
        a.Description,
        a.CreatedAt
      FROM dbo.AdminActivityLogs a
      LEFT JOIN dbo.Users u
        ON a.AdminID = u.UserID
      ORDER BY a.CreatedAt DESC, a.LogID DESC
    `);

    return res.status(200).json({
      success: true,
      total: result.recordset.length,
      activities: result.recordset
    });
  } catch (error) {
    console.error("Get admin activities:", error.message);

    return res.status(500).json({
      message: "Unable to fetch admin activity logs."
    });
  }
};

// CREATE ADMIN ACTIVITY LOG
const createAdminActivity = async (
  adminId,
  action,
  description
) => {
  const pool = await connectDB();

  await pool.request()
    .input("AdminID", sql.Int, adminId)
    .input("Action", sql.NVarChar(100), action)
    .input("Description", sql.NVarChar(500), description)
    .query(`
      INSERT INTO dbo.AdminActivityLogs
        (AdminID, Action, Description)
      VALUES
        (@AdminID, @Action, @Description)
    `);
};

module.exports = {
  getAdminActivities,
  createAdminActivity
};

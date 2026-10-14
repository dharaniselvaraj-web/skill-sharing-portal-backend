const { connectDB } = require("../database/db");

// ==========================================
// GET ALL USERS FOR ADMIN
// GET /api/admin/users
// ==========================================
const getAllUsers = async (req, res) => {
  try {
    // Check admin permission
    if (
      !req.user ||
      String(req.user.role || "").toLowerCase() !== "admin"
    ) {
      return res.status(403).json({
        message: "Admin access required."
      });
    }

    // Connect to MSSQL
    const pool = await connectDB();

    // Fetch actual users from database
    const result = await pool.request().query(`
      SELECT
        UserID,
        Name,
        Email,
        Role,
        Status,
        IsActive,
        CreatedAt
      FROM Users
      ORDER BY UserID DESC
    `);

    // Convert database columns to frontend-friendly fields
    const users = result.recordset.map((user) => ({
      userId: user.UserID,
      name: user.Name,
      email: user.Email,
      role: user.Role,
      status: user.Status,
      isActive:
        user.IsActive === true ||
        user.IsActive === 1,
      createdAt: user.CreatedAt
    }));

    return res.status(200).json(users);

  } catch (error) {
    console.error("Get admin users error:", error);

    return res.status(500).json({
      message: "Failed to fetch users from database."
    });
  }
};

module.exports = {
  getAllUsers
};
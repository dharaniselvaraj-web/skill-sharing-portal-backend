
const { connectDB } = require("../database/db");

// GET ALL USERS (ADMIN ONLY)
const getAllUsers = async (req, res) => {
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
        UserID,
        Name,
        Email,
        Role
      FROM Users
      ORDER BY UserID DESC
    `);

    return res.status(200).json(result.recordset);
  } catch (error) {
    console.error("Get admin users error:", error);

    return res.status(500).json({
      message: "Failed to fetch users."
    });
  }
const { connectDB } = require("../database/db");

// ==========================================
// GET ALL USERS FOR ADMIN
// ==========================================
const getAllUsers = async (req, res) => {
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

    const pool = await connectDB();

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

    const users = result.recordset.map((user) => ({
      userId: user.UserID,
      name: user.Name,
      email: user.Email,
      role: user.Role,
      status: user.Status,
      isActive: user.IsActive === true || user.IsActive === 1,
      createdAt: user.CreatedAt
    }));

    return res.status(200).json(users);

  } catch (error) {
    console.error("Get admin users error:", error);

    return res.status(500).json({
      message: "Failed to fetch users."
    });
  }
};

module.exports = {
  getAllUsers
};
};

module.exports = { getAllUsers };
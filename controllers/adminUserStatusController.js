
const { sql, connectDB } = require("../database/db");

const updateUserStatus = async (req, res) => {
  try {
    if (
      !req.user ||
      String(req.user.role || "").toLowerCase() !== "admin"
    ) {
      return res.status(403).json({
        message: "Admin access required."
      });
    }

    const userId = Number(req.params.id);
    const { isActive } = req.body;

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({
        message: "Invalid user ID."
      });
    }

    if (typeof isActive !== "boolean") {
      return res.status(400).json({
        message: "isActive must be true or false."
      });
    }

    if (Number(req.user.id) === userId && !isActive) {
      return res.status(400).json({
        message: "You cannot deactivate your own account."
      });
    }

    const pool = await connectDB();

    const result = await pool.request()
      .input("UserID", sql.Int, userId)
      .input("IsActive", sql.Bit, isActive)
      .query(`
        UPDATE Users
        SET IsActive = @IsActive
        WHERE UserID = @UserID;

        SELECT @@ROWCOUNT AS RowsAffected;
      `);

    if (result.recordset[0].RowsAffected === 0) {
      return res.status(404).json({
        message: "User not found."
      });
    }

    return res.status(200).json({
      message: isActive
        ? "User activated successfully."
        : "User deactivated successfully.",
      userId,
      isActive
    });
  } catch (error) {
    console.error("Update user status error:", error);

    return res.status(500).json({
      message: "Failed to update user status."
    });
  }
};

module.exports = { updateUserStatus };
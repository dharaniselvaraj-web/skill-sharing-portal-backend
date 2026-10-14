
const { sql, connectDB } = require("../database/db");
const {
  createAdminActivity
} = require("./adminActivityController");

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

    // Validate user ID
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({
        message: "Invalid user ID."
      });
    }

    // Validate status
    if (typeof isActive !== "boolean") {
      return res.status(400).json({
        message: "isActive must be true or false."
      });
    }

    // Prevent admin from deactivating their own account
    if (Number(req.user.id) === userId && !isActive) {
      return res.status(400).json({
        message: "You cannot deactivate your own account."
      });
    }

    const pool = await connectDB();

    // Update user status
    const result = await pool.request()
      .input("UserID", sql.Int, userId)
      .input("IsActive", sql.Bit, isActive)
      .query(`
        UPDATE dbo.Users
        SET IsActive = @IsActive
        WHERE UserID = @UserID;

        SELECT @@ROWCOUNT AS RowsAffected;
      `);

    if (
      !result.recordset ||
      result.recordset[0].RowsAffected === 0
    ) {
      return res.status(404).json({
        message: "User not found."
      });
    }

    // Record successful admin action
    try {
      const adminId = Number(req.user.id);

      if (Number.isInteger(adminId) && adminId > 0) {
        await createAdminActivity(
          adminId,
          isActive ? "USER_ACTIVATED" : "USER_DEACTIVATED",
          `Admin ${isActive ? "activated" : "deactivated"} user ID ${userId}.`
        );
      } else {
        console.error(
          "Activity log skipped: valid admin ID not found in req.user.id."
        );
      }
    } catch (logError) {
      // The user status update has already succeeded.
      // Do not report the update itself as failed.
      console.error(
        "Failed to save admin activity log:",
        logError.message
      );
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


const jwt = require("jsonwebtoken");
const { sql, connectDB } = require("../database/db");

const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "A valid Bearer token is required."
      });
    }

    function verifyAdmin(req, res, next) {
      if (
        !req.user ||
        String(req.user.role || req.user.Role || "").toLowerCase() !== "admin"
      ) {
        return res.status(403).json({
          message: "Access denied. Admin permission required."
        });
      }

      next();
    }

    module.exports = verifyAdmin;

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        message: "Access token is required."
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    // Support the user ID claim used in the JWT.
    const userId = Number(
      decoded.id ?? decoded.UserID ?? decoded.userId
    );

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(401).json({
        message: "Invalid user information in token."
      });
    }

    // Check the latest account status in MSSQL.
    const pool = await connectDB();

    const result = await pool.request()
      .input("UserID", sql.Int, userId)
      .query(`
        SELECT UserID, Role, IsActive
        FROM Users
        WHERE UserID = @UserID
      `);

    if (result.recordset.length === 0) {
      return res.status(401).json({
        message: "User account not found."
      });
    }

    const user = result.recordset[0];

    if (!user.IsActive) {
      return res.status(403).json({
        message: "Your account has been deactivated."
      });
    }

    // Use the current database role, not the role from an old token.
    req.user = {
      ...decoded,
      id: user.UserID,
      role: user.Role
    };

    next();

  } catch (error) {
    console.error("Authentication error:", error);

    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError" ||
      error.name === "NotBeforeError"
    ) {
      return res.status(401).json({
        message: "Invalid or expired token."
      });
    }

    return res.status(500).json({
      message: "Authentication verification failed."
    });
  }
};

module.exports = verifyToken;
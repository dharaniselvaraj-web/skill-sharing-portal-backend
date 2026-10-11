
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { sql, connectDB } = require("../database/db");

// ==========================================
// REGISTER USER
// ==========================================
const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email and password are required."
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters."
      });
    }

    const pool = await connectDB();

    const existingUser = await pool
      .request()
      .input("email", sql.NVarChar(150), email)
      .query(`
        SELECT UserID
        FROM Users
        WHERE Email = @email
      `);

    if (existingUser.recordset.length > 0) {
      return res.status(409).json({
        message: "Email already registered."
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await pool
      .request()
      .input("name", sql.NVarChar(100), name)
      .input("email", sql.NVarChar(150), email)
      .input("passwordHash", sql.NVarChar(255), passwordHash)
      .query(`
        INSERT INTO Users
          (Name, Email, PasswordHash, Role, Status)
        VALUES
          (@name, @email, @passwordHash, 'student', 'Active')
      `);

    return res.status(201).json({
      message: "Registration successful!"
    });

  } catch (error) {
    console.error("Registration error:", error);

    return res.status(500).json({
      message: "Server error during registration."
    });
  }
};


// ==========================================
// LOGIN USER
// ==========================================
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required."
      });
    }

    const pool = await connectDB();

    const result = await pool
      .request()
      .input("email", sql.NVarChar(150), email)
      .query(`
        SELECT
          UserID,
          Name,
          Email,
          PasswordHash,
          Role,
          Status,
          IsActive
        FROM Users
        WHERE Email = @email
      `);

    if (result.recordset.length === 0) {
      return res.status(401).json({
        message: "Invalid email or password."
      });
    }

    const user = result.recordset[0];

    // Verify the password first.
    const passwordMatch = await bcrypt.compare(
      password,
      user.PasswordHash
    );

    if (!passwordMatch) {
      return res.status(401).json({
        message: "Invalid email or password."
      });
    }

    // Check the account's existing Status field.
    if (
      String(user.Status || "").toLowerCase() !== "active"
    ) {
      return res.status(403).json({
        message: "Your account is not active."
      });
    }

    // Also check the admin-controlled IsActive field.
    // SQL Server BIT values are normally returned as booleans.
    if (
      user.IsActive !== true &&
      user.IsActive !== 1
    ) {
      return res.status(403).json({
        message: "Your account has been deactivated."
      });
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not configured.");
    }

    // Generate JWT only after both status checks pass.
    const token = jwt.sign(
      {
        userId: user.UserID,
        role: user.Role
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d"
      }
    );

    return res.status(200).json({
      message: "Login successful!",
      token,
      user: {
        id: user.UserID,
        name: user.Name,
        email: user.Email,
        role: user.Role
      }
    });

  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      message: "Server error during login."
    });
  }
};


// ==========================================
// GET CURRENT USER
// ==========================================
const getCurrentUser = async (req, res) => {
  try {
    const pool = await connectDB();

    const result = await pool
      .request()
      .input("userId", sql.Int, req.user.userId)
      .query(`
        SELECT
          UserID,
          Name,
          Email,
          Role,
          Status,
          CreatedAt
        FROM Users
        WHERE UserID = @userId
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({
        message: "User not found."
      });
    }

    const user = result.recordset[0];

    return res.status(200).json({
      user: {
        id: user.UserID,
        name: user.Name,
        email: user.Email,
        role: user.Role,
        status: user.Status,
        createdAt: user.CreatedAt
      }
    });

  } catch (error) {
    console.error("Get current user error:", error);

    return res.status(500).json({
      message: "Server error."
    });
  }
};


// ==========================================
// EXPORT
// ==========================================
module.exports = {
  registerUser,
  loginUser,
  getCurrentUser
};
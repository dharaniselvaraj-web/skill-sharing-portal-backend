
const { sql, connectDB } = require("./db");
const bcrypt = require("bcryptjs");
const readline = require("readline/promises");
const { stdin, stdout } = require("process");

const rl = readline.createInterface({
  input: stdin,
  output: stdout
});

async function createAdmin() {
  try {
    console.log("\n=== Create Admin Account ===\n");

    const name = (await rl.question("Admin name: ")).trim();
    const email = (
      await rl.question("Admin email: ")
    ).trim().toLowerCase();
    const password = await rl.question("Admin password: ");

    if (!name || !email || !password) {
      console.log("Name, email and password are required.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      console.log("Please enter a valid email address.");
      return;
    }

    if (password.length < 8) {
      console.log("Password must contain at least 8 characters.");
      return;
    }

    const pool = await connectDB();

    // 1. Check whether an Admin already exists
    const adminCheck = await pool.request().query(`
      SELECT COUNT(*) AS AdminCount
      FROM dbo.Users
      WHERE LOWER(Role) = 'admin'
    `);

    if (adminCheck.recordset[0].AdminCount > 0) {
      console.log(
        "An Admin account already exists. No new Admin created."
      );
      return;
    }

    // 2. Check whether this email is already registered
    const emailCheck = await pool.request()
      .input("email", sql.NVarChar, email)
      .query(`
        SELECT UserID, Email, Role
        FROM dbo.Users
        WHERE LOWER(Email) = LOWER(@email)
      `);

    if (emailCheck.recordset.length > 0) {
      console.log(
        "This email is already registered. No account was changed."
      );
      console.table(emailCheck.recordset);
      console.log(
        "Use a new email address for the initial Admin account."
      );
      return;
    }

    // 3. Hash the password
    const passwordHash = await bcrypt.hash(password, 12);

    // 4. Create the only Admin account
    await pool.request()
      .input("name", sql.NVarChar, name)
      .input("email", sql.NVarChar, email)
      .input("passwordHash", sql.NVarChar, passwordHash)
      .query(`
        INSERT INTO dbo.Users
          (Name, Email, PasswordHash, Role, Status, IsActive)
        VALUES
          (@name, @email, @passwordHash, 'admin', 'Active', 1)
      `);

    console.log("\nAdmin account created successfully!");

    const result = await pool.request()
      .input("email", sql.NVarChar, email)
      .query(`
        SELECT UserID, Name, Email, Role, Status, IsActive
        FROM dbo.Users
        WHERE Email = @email
      `);

    console.table(result.recordset);
    console.log("You can now log in with this Admin account.");

  } catch (error) {
    console.error("Admin creation failed:", error.message);
  } finally {
    rl.close();
    process.exit();
  }
}

createAdmin();

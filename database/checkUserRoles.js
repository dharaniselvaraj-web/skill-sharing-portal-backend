
const { connectDB } = require("./db");

async function checkUserRoles() {
  try {
    const pool = await connectDB();

    const result = await pool.request().query(`
      SELECT UserID, Name, Email, Role, Status
      FROM dbo.Users
      ORDER BY UserID
    `);

    console.table(result.recordset);
    console.log("Total users:", result.recordset.length);
  } catch (error) {
    console.error("Database error:", error.message);
  } finally {
    process.exit();
  }
}

checkUserRoles();

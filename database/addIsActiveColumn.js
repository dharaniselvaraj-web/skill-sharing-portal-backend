
const { connectDB } = require("./db");

async function addIsActiveColumn() {
  try {
    const pool = await connectDB();

    await pool.request().query(`
      IF COL_LENGTH('dbo.Users', 'IsActive') IS NULL
      BEGIN
        ALTER TABLE dbo.Users
        ADD IsActive BIT NOT NULL
          CONSTRAINT DF_Users_IsActive DEFAULT (1)
          WITH VALUES;
      END;
    `);

    console.log("IsActive column is ready.");

    const result = await pool.request().query(`
      SELECT UserID, Name, Email, Status, IsActive
      FROM dbo.Users;
    `);

    console.table(result.recordset);
  } catch (error) {
    console.error("Failed to add IsActive column:", error);
  } finally {
    process.exit();
  }
}

addIsActiveColumn();

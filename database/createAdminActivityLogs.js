
const { connectDB } = require("./db");

async function createAdminActivityLogs() {
  try {
    const pool = await connectDB();

    await pool.request().query(`
      IF OBJECT_ID('dbo.AdminActivityLogs', 'U') IS NULL
      BEGIN
        CREATE TABLE dbo.AdminActivityLogs (
          LogID INT IDENTITY(1,1) PRIMARY KEY,
          AdminID INT NOT NULL,
          Action NVARCHAR(100) NOT NULL,
          Description NVARCHAR(500) NOT NULL,
          CreatedAt DATETIME2 NOT NULL
            DEFAULT SYSDATETIME(),

          CONSTRAINT FK_AdminActivityLogs_Users
            FOREIGN KEY (AdminID)
            REFERENCES dbo.Users(UserID)
        );
      END;
    `);

    console.log("AdminActivityLogs table is ready.");
  } catch (error) {
    console.error(
      "Failed to create AdminActivityLogs table:",
      error.message
    );
  } finally {
    process.exit();
  }
}

createAdminActivityLogs();

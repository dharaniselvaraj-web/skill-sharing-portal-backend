
const { connectDB } = require("./db");

async function checkAdminActivityLogs() {
  try {
    const pool = await connectDB();

    const result = await pool.request().query(`
      SELECT
        DB_NAME() AS CurrentDatabase,
        OBJECT_ID(N'dbo.AdminActivityLogs', N'U') AS TableObjectId;

      SELECT
        s.name AS SchemaName,
        t.name AS TableName
      FROM sys.tables t
      INNER JOIN sys.schemas s
        ON t.schema_id = s.schema_id
      WHERE t.name = 'AdminActivityLogs';
    `);

    console.log("\n--- Database Check ---");
    console.table(result.recordsets[0]);

    console.log("\n--- Activity Log Table Search ---");
    console.table(result.recordsets[1]);
  } catch (error) {
    console.error("Database check failed:", error.message);
  } finally {
    process.exit();
  }
}

checkAdminActivityLogs();

const sql = require("mssql/msnodesqlv8");

const config = {
  server: "localhost",
  database: "master",
  driver: "ODBC Driver 18 for SQL Server",
  options: {
    trustedConnection: true,
    trustServerCertificate: true
  }
};

async function setupDatabase() {
  try {
    console.log("Connecting to SQL Server...");

    const pool = await sql.connect(config);

    console.log("SQL Server connected successfully!");

    await pool.request().query(`
      IF DB_ID('SkillSharingPortal') IS NULL
      BEGIN
        CREATE DATABASE SkillSharingPortal;
      END
    `);

    console.log("SkillSharingPortal database created successfully!");

    await pool.close();
  } catch (error) {
    console.error("Database setup failed:");
    console.error(error.message);
  }
}

setupDatabase();
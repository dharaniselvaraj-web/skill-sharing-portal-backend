const sql = require("mssql/msnodesqlv8");

const config = {
  server: "localhost",
  database: "master",
  driver: "ODBC Driver 18 for SQL Server",
  options: {
    trustedConnection: true,
    trustServerCertificate: true
  },
  connectionTimeout: 5000
};

async function testConnection() {
  try {
    console.log("Trying to connect to SQL Server...");

    const pool = await sql.connect(config);

    console.log("✅ SQL Server connected successfully!");

    const result = await pool.request().query(`
      SELECT @@VERSION AS Version
    `);

    console.log("SQL Server version:");
    console.log(result.recordset[0].Version);

    await pool.close();
  } catch (error) {
    console.log("❌ Connection failed:");
    console.log(error.message);
  }
}

testConnection();
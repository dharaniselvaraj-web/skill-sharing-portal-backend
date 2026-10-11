const sql = require("mssql/msnodesqlv8");

const dbConfig = {
  server: "localhost",
  database: "SkillSharingPortal",
  driver: "ODBC Driver 18 for SQL Server",
  options: {
    trustedConnection: true,
    trustServerCertificate: true
  },
  connectionTimeout: 5000
};

let poolPromise = null;

const connectDB = async () => {
  try {
    if (!poolPromise) {
      poolPromise = sql.connect(dbConfig);
    }

    const pool = await poolPromise;

    return pool;
  } catch (error) {
    poolPromise = null;

    console.error("Database connection failed:");
    console.error(error.message);

    throw error;
  }
};

module.exports = {
  sql,
  connectDB
};
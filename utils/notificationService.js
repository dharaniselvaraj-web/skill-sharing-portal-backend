const { sql, connectDB } = require("../database/db");

const createNotification = async (
  userId,
  title,
  message,
  type = "General"
) => {
  try {
    const pool = await connectDB();

    await pool
      .request()
      .input("userId", sql.Int, userId)
      .input("title", sql.NVarChar(200), title)
      .input("message", sql.NVarChar(1000), message)
      .input("type", sql.NVarChar(50), type)
      .query(`
        INSERT INTO Notifications
        (
          UserID,
          Title,
          Message,
          Type,
          IsRead
        )
        VALUES
        (
          @userId,
          @title,
          @message,
          @type,
          0
        )
      `);

    console.log(`🔔 Notification created for UserID: ${userId}`);

  } catch (error) {
    console.error("Notification creation error:");
    console.error(error.message);
  }
};

module.exports = {
  createNotification
};
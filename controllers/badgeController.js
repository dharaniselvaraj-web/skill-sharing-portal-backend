const { sql, connectDB } = require("../database/db");

// ==========================================
// GET ALL BADGES
// ==========================================
const getAllBadges = async (req, res) => {
  try {
    const pool = await connectDB();

    const result = await pool.request().query(`
      SELECT
        BadgeID,
        BadgeName,
        Description,
        Icon
      FROM Badges
      ORDER BY BadgeID ASC
    `);

    return res.status(200).json({
      badges: result.recordset
    });

  } catch (error) {
    console.error("Get badges error:");
    console.error(error.message);

    return res.status(500).json({
      message: "Server error while fetching badges."
    });
  }
};


// ==========================================
// GET MY BADGES
// ==========================================
const getMyBadges = async (req, res) => {
  try {
    const pool = await connectDB();

    const result = await pool
      .request()
      .input("userId", sql.Int, req.user.userId)
      .query(`
        SELECT
          ub.UserBadgeID,
          ub.UserID,
          b.BadgeID,
          b.BadgeName,
          b.Description,
          b.Icon,
          ub.AwardedAt
        FROM UserBadges ub

        INNER JOIN Badges b
          ON ub.BadgeID = b.BadgeID

        WHERE ub.UserID = @userId

        ORDER BY ub.AwardedAt DESC
      `);

    return res.status(200).json({
      badges: result.recordset
    });

  } catch (error) {
    console.error("Get my badges error:");
    console.error(error.message);

    return res.status(500).json({
      message: "Server error while fetching your badges."
    });
  }
};


// ==========================================
// GET USER BADGES
// ==========================================
const getUserBadges = async (req, res) => {
  try {
    const { userId } = req.params;

    const pool = await connectDB();

    const result = await pool
      .request()
      .input("userId", sql.Int, userId)
      .query(`
        SELECT
          ub.UserBadgeID,
          ub.UserID,
          b.BadgeID,
          b.BadgeName,
          b.Description,
          b.Icon,
          ub.AwardedAt
        FROM UserBadges ub

        INNER JOIN Badges b
          ON ub.BadgeID = b.BadgeID

        WHERE ub.UserID = @userId

        ORDER BY ub.AwardedAt DESC
      `);

    return res.status(200).json({
      badges: result.recordset
    });

  } catch (error) {
    console.error("Get user badges error:");
    console.error(error.message);

    return res.status(500).json({
      message: "Server error while fetching user badges."
    });
  }
};


// ==========================================
// CREATE BADGE
// ==========================================
const createBadge = async (req, res) => {
  try {
    const {
      badgeName,
      description,
      icon
    } = req.body;

    if (!badgeName) {
      return res.status(400).json({
        message: "Badge name is required."
      });
    }

    const pool = await connectDB();

    const existing = await pool
      .request()
      .input("badgeName", sql.NVarChar(100), badgeName)
      .query(`
        SELECT BadgeID
        FROM Badges
        WHERE BadgeName = @badgeName
      `);

    if (existing.recordset.length > 0) {
      return res.status(409).json({
        message: "Badge already exists."
      });
    }

    const result = await pool
      .request()
      .input("badgeName", sql.NVarChar(100), badgeName)
      .input(
        "description",
        sql.NVarChar(500),
        description || null
      )
      .input(
        "icon",
        sql.NVarChar(255),
        icon || null
      )
      .query(`
        INSERT INTO Badges
        (
          BadgeName,
          Description,
          Icon
        )

        OUTPUT
          INSERTED.BadgeID,
          INSERTED.BadgeName,
          INSERTED.Description,
          INSERTED.Icon

        VALUES
        (
          @badgeName,
          @description,
          @icon
        )
      `);

    return res.status(201).json({
      message: "Badge created successfully!",
      badge: result.recordset[0]
    });

  } catch (error) {
    console.error("Create badge error:");
    console.error(error.message);

    return res.status(500).json({
      message: "Server error while creating badge."
    });
  }
};


// ==========================================
// AWARD BADGE
// ==========================================
const awardBadge = async (req, res) => {
  try {
    const { userId, badgeId } = req.body;

    if (!userId || !badgeId) {
      return res.status(400).json({
        message: "User ID and badge ID are required."
      });
    }

    const pool = await connectDB();

    // Check user
    const userResult = await pool
      .request()
      .input("userId", sql.Int, userId)
      .query(`
        SELECT UserID
        FROM Users
        WHERE UserID = @userId
      `);

    if (userResult.recordset.length === 0) {
      return res.status(404).json({
        message: "User not found."
      });
    }

    // Check badge
    const badgeResult = await pool
      .request()
      .input("badgeId", sql.Int, badgeId)
      .query(`
        SELECT BadgeID
        FROM Badges
        WHERE BadgeID = @badgeId
      `);

    if (badgeResult.recordset.length === 0) {
      return res.status(404).json({
        message: "Badge not found."
      });
    }

    // Duplicate check
    const existing = await pool
      .request()
      .input("userId", sql.Int, userId)
      .input("badgeId", sql.Int, badgeId)
      .query(`
        SELECT UserBadgeID
        FROM UserBadges
        WHERE UserID = @userId
          AND BadgeID = @badgeId
      `);

    if (existing.recordset.length > 0) {
      return res.status(409).json({
        message: "User already has this badge."
      });
    }

    const result = await pool
      .request()
      .input("userId", sql.Int, userId)
      .input("badgeId", sql.Int, badgeId)
      .query(`
        INSERT INTO UserBadges
        (
          UserID,
          BadgeID
        )

        OUTPUT
          INSERTED.UserBadgeID,
          INSERTED.UserID,
          INSERTED.BadgeID,
          INSERTED.AwardedAt

        VALUES
        (
          @userId,
          @badgeId
        )
      `);

    return res.status(201).json({
      message: "Badge awarded successfully!",
      userBadge: result.recordset[0]
    });

  } catch (error) {
    console.error("Award badge error:");
    console.error(error.message);

    return res.status(500).json({
      message: "Server error while awarding badge."
    });
  }
};


// ==========================================
// GET MY REPUTATION
// ==========================================
const getMyReputation = async (req, res) => {
  try {
    const pool = await connectDB();

    const result = await pool
      .request()
      .input("userId", sql.Int, req.user.userId)
      .query(`
        SELECT

          -- Sessions created by teacher
          (
            SELECT COUNT(*)
            FROM Sessions
            WHERE TeacherID = @userId
          ) AS SessionsCreated,

          -- Accepted learners in user's sessions
          (
            SELECT COUNT(*)
            FROM Enrollments e
            INNER JOIN Sessions s
              ON e.SessionID = s.SessionID
            WHERE s.TeacherID = @userId
              AND e.Status = 'Accepted'
          ) AS AcceptedLearners,

          -- Reviews received
          (
            SELECT COUNT(*)
            FROM Feedback f
            INNER JOIN Sessions s
              ON f.SessionID = s.SessionID
            WHERE s.TeacherID = @userId
          ) AS ReviewsReceived,

          -- Average rating
          (
            SELECT ISNULL(
              AVG(CAST(f.Rating AS DECIMAL(10,2))),
              0
            )
            FROM Feedback f
            INNER JOIN Sessions s
              ON f.SessionID = s.SessionID
            WHERE s.TeacherID = @userId
          ) AS AverageRating
      `);

    const stats = result.recordset[0];

    const reputationScore =
      (stats.SessionsCreated * 10) +
      (stats.AcceptedLearners * 5) +
      (stats.ReviewsReceived * 10);

    return res.status(200).json({
      reputation: {
        score: reputationScore,
        sessionsCreated: stats.SessionsCreated,
        acceptedLearners: stats.AcceptedLearners,
        reviewsReceived: stats.ReviewsReceived,
        averageRating: stats.AverageRating
      }
    });

  } catch (error) {
    console.error("Get reputation error:");
    console.error(error.message);

    return res.status(500).json({
      message: "Server error while calculating reputation."
    });
  }
};


module.exports = {
  getAllBadges,
  getMyBadges,
  getUserBadges,
  createBadge,
  awardBadge,
  getMyReputation
};
const { sql, connectDB } = require("../database/db");
const { sendNotification } = require("../utils/notificationService");

// ==========================================
// GET ALL SESSIONS
// ==========================================
const getSessions = async (req, res) => {
  try {
    const pool = await connectDB();

    const result = await pool.request().query(`
      SELECT
        s.SessionID,
        s.TeacherID,
        u.Name AS TeacherName,
        s.SkillID,
        sk.SkillName,
        s.Title,
        s.Description,
        s.SessionDate,
        s.StartTime,
        s.EndTime,
        s.MaxParticipants,

        CASE
          WHEN
            CAST(s.SessionDate AS DATETIME)
            + CAST(s.EndTime AS DATETIME)
            < GETDATE()
            AND s.Status = 'Open'
          THEN 'Completed'

          WHEN
            s.Status = 'Open'
            AND
            (
              SELECT COUNT(*)
              FROM Enrollments e
              WHERE e.SessionID = s.SessionID
              AND e.Status IN ('Pending', 'Accepted')
            ) >= s.MaxParticipants
          THEN 'Full'

          ELSE s.Status
        END AS Status,

        s.CreatedAt,

        (
          SELECT COUNT(*)
          FROM Enrollments e
          WHERE e.SessionID = s.SessionID
          AND e.Status IN ('Pending', 'Accepted')
        ) AS EnrolledCount

      FROM Sessions s

      INNER JOIN Users u
        ON s.TeacherID = u.UserID

      INNER JOIN Skills sk
        ON s.SkillID = sk.SkillID

      ORDER BY s.SessionDate ASC, s.StartTime ASC
    `);

    return res.status(200).json({
      sessions: result.recordset
    });

  } catch (error) {
    console.error("Get sessions error:");
    console.error(error.message);

    return res.status(500).json({
      message: "Server error while fetching sessions."
    });
  }
};


// ==========================================
// GET SINGLE SESSION
// ==========================================
const getSessionById = async (req, res) => {
  try {
    const { id } = req.params;

    const pool = await connectDB();

    const result = await pool
      .request()
      .input("sessionId", sql.Int, id)
      .query(`
        SELECT
          s.SessionID,
          s.TeacherID,
          u.Name AS TeacherName,
          s.SkillID,
          sk.SkillName,
          s.Title,
          s.Description,
          s.SessionDate,
          s.StartTime,
          s.EndTime,
          s.MaxParticipants,

          CASE
            WHEN
              CAST(s.SessionDate AS DATETIME)
              + CAST(s.EndTime AS DATETIME)
              < GETDATE()
              AND s.Status = 'Open'
            THEN 'Completed'

            WHEN
              s.Status = 'Open'
              AND
              (
                SELECT COUNT(*)
                FROM Enrollments e
                WHERE e.SessionID = s.SessionID
                AND e.Status IN ('Pending', 'Accepted')
              ) >= s.MaxParticipants
            THEN 'Full'

            ELSE s.Status
          END AS Status,

          s.CreatedAt,

          (
            SELECT COUNT(*)
            FROM Enrollments e
            WHERE e.SessionID = s.SessionID
            AND e.Status IN ('Pending', 'Accepted')
          ) AS EnrolledCount

        FROM Sessions s

        INNER JOIN Users u
          ON s.TeacherID = u.UserID

        INNER JOIN Skills sk
          ON s.SkillID = sk.SkillID

        WHERE s.SessionID = @sessionId
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({
        message: "Session not found."
      });
    }

    return res.status(200).json({
      session: result.recordset[0]
    });

  } catch (error) {
    console.error("Get session error:");
    console.error(error.message);

    return res.status(500).json({
      message: "Server error while fetching session."
    });
  }
};


// ==========================================
// CREATE SESSION
// ==========================================
const createSession = async (req, res) => {
  try {
    const {
      skillId,
      title,
      description,
      sessionDate,
      startTime,
      endTime,
      maxParticipants
    } = req.body;

    // ------------------------------------------
    // Required field validation
    // ------------------------------------------
    if (
      !skillId ||
      !title ||
      !sessionDate ||
      !startTime ||
      !endTime
    ) {
      return res.status(400).json({
        message:
          "Skill, title, date, start time and end time are required."
      });
    }

    // ------------------------------------------
    // Validate start and end time
    // ------------------------------------------
    if (startTime >= endTime) {
      return res.status(400).json({
        message: "End time must be after start time."
      });
    }

    // ------------------------------------------
    // Validate session date and start time
    // ------------------------------------------
    const selectedDateTime = new Date(
      `${sessionDate}T${startTime}`
    );

    if (isNaN(selectedDateTime.getTime())) {
      return res.status(400).json({
        message: "Invalid session date or start time."
      });
    }

    const currentDateTime = new Date();

    if (selectedDateTime <= currentDateTime) {
      return res.status(400).json({
        message:
          "Session date and start time must be in the future."
      });
    }

    // ------------------------------------------
    // Maximum participants
    // ------------------------------------------
    const participants = Number(maxParticipants) || 10;

    if (participants < 1) {
      return res.status(400).json({
        message: "Maximum participants must be at least 1."
      });
    }

    const pool = await connectDB();

    // ------------------------------------------
    // Check skill
    // ------------------------------------------
    const skillResult = await pool
      .request()
      .input("skillId", sql.Int, skillId)
      .query(`
        SELECT SkillID, SkillName
        FROM Skills
        WHERE SkillID = @skillId
      `);

    if (skillResult.recordset.length === 0) {
      return res.status(404).json({
        message: "Skill not found."
      });
    }

    // ------------------------------------------
    // Check whether logged-in user
    // has this skill as Teach
    // ------------------------------------------
    const teacherSkill = await pool
      .request()
      .input("userId", sql.Int, req.user.userId)
      .input("skillId", sql.Int, skillId)
      .query(`
        SELECT UserSkillID
        FROM UserSkills
        WHERE UserID = @userId
          AND SkillID = @skillId
          AND SkillType = 'Teach'
      `);

    if (teacherSkill.recordset.length === 0) {
      return res.status(403).json({
        message:
          "You can create a session only for a skill you teach."
      });
    }

    // ------------------------------------------
    // Insert session
    // ------------------------------------------
    const result = await pool
      .request()
      .input("teacherId", sql.Int, req.user.userId)
      .input("skillId", sql.Int, skillId)
      .input("title", sql.NVarChar(150), title.trim())
      .input(
        "description",
        sql.NVarChar(1000),
        description ? description.trim() : null
      )
      .input(
        "sessionDate",
        sql.NVarChar(20),
        sessionDate
      )
      .input(
        "startTime",
        sql.NVarChar(20),
        startTime
      )
      .input(
        "endTime",
        sql.NVarChar(20),
        endTime
      )
      .input(
        "maxParticipants",
        sql.Int,
        participants
      )
      .query(`
        INSERT INTO Sessions
        (
          TeacherID,
          SkillID,
          Title,
          Description,
          SessionDate,
          StartTime,
          EndTime,
          MaxParticipants,
          Status
        )

        OUTPUT
          INSERTED.SessionID,
          INSERTED.TeacherID,
          INSERTED.SkillID,
          INSERTED.Title,
          INSERTED.Description,
          INSERTED.SessionDate,
          INSERTED.StartTime,
          INSERTED.EndTime,
          INSERTED.MaxParticipants,
          INSERTED.Status,
          INSERTED.CreatedAt

        VALUES
        (
          @teacherId,
          @skillId,
          @title,
          @description,
          CAST(@sessionDate AS DATE),
          CAST(@startTime AS TIME),
          CAST(@endTime AS TIME),
          @maxParticipants,
          'Open'
        )
      `);

    // ==========================================
    // NOTIFY STUDENTS WHO LEARN THIS SKILL
    // ==========================================

    const learnersResult = await pool
      .request()
      .input("skillId", sql.Int, skillId)
      .input("teacherId", sql.Int, req.user.userId)
      .query(`
        SELECT DISTINCT
          us.UserID
        FROM UserSkills us
        WHERE us.SkillID = @skillId
          AND us.SkillType = 'Learn'
          AND us.UserID <> @teacherId
      `);

    // ------------------------------------------
    // SEND NOTIFICATION TO EACH LEARNER
    // ------------------------------------------
    for (const learner of learnersResult.recordset) {
      await sendNotification(
        learner.UserID,
        "New Session Available",
        `A new ${skillResult.recordset[0].SkillName} session "${title.trim()}" is now available.`,
        "Session"
      );
    }

    return res.status(201).json({
      message: "Session created successfully!",
      session: result.recordset[0]
    });

  } catch (error) {
    console.error("Create session error:");
    console.error(error.message);

    return res.status(500).json({
      message: "Server error while creating session."
    });
  }
};


// ==========================================
// UPDATE SESSION
// ==========================================
const updateSession = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      skillId,
      title,
      description,
      sessionDate,
      startTime,
      endTime,
      maxParticipants
    } = req.body;

    // ------------------------------------------
    // Required field validation
    // ------------------------------------------
    if (
      !skillId ||
      !title ||
      !sessionDate ||
      !startTime ||
      !endTime
    ) {
      return res.status(400).json({
        message:
          "Skill, title, date, start time and end time are required."
      });
    }

    // ------------------------------------------
    // Validate start and end time
    // ------------------------------------------
    if (startTime >= endTime) {
      return res.status(400).json({
        message: "End time must be after start time."
      });
    }

    // ------------------------------------------
    // Validate session date and start time
    // ------------------------------------------
    const selectedDateTime = new Date(
      `${sessionDate}T${startTime}`
    );

    if (isNaN(selectedDateTime.getTime())) {
      return res.status(400).json({
        message: "Invalid session date or start time."
      });
    }

    const currentDateTime = new Date();

    if (selectedDateTime <= currentDateTime) {
      return res.status(400).json({
        message:
          "Session date and start time must be in the future."
      });
    }

    // ------------------------------------------
    // Maximum participants
    // ------------------------------------------
    const participants = Number(maxParticipants) || 10;

    if (participants < 1) {
      return res.status(400).json({
        message: "Maximum participants must be at least 1."
      });
    }

    const pool = await connectDB();

    // ------------------------------------------
    // Verify session belongs to logged-in teacher
    // ------------------------------------------
    const existingSession = await pool
      .request()
      .input("sessionId", sql.Int, id)
      .input("teacherId", sql.Int, req.user.userId)
      .query(`
    SELECT
      SessionID,
      Title,
      Status,
      SessionDate,
      StartTime,
      EndTime
    FROM Sessions
    WHERE SessionID = @sessionId
      AND TeacherID = @teacherId
  `);

    if (existingSession.recordset.length === 0) {
      return res.status(404).json({
        message: "Session not found or access denied."
      });
    }

    const currentSession = existingSession.recordset[0];

    // ------------------------------------------
    // Prevent editing cancelled / closed sessions
    // ------------------------------------------

    let effectiveStatus = currentSession.Status;

    // Check whether an Open session has already completed
    const sessionEndDateTime = new Date(
      `${currentSession.SessionDate.toISOString().split("T")[0]}T${currentSession.EndTime}`
    );

    if (
      currentSession.Status !== "Cancelled" &&
      currentSession.Status !== "Closed" &&
      sessionEndDateTime < new Date()
    ) {
      effectiveStatus = "Completed";
    }

    if (
      effectiveStatus === "Cancelled" ||
      effectiveStatus === "Completed" ||
      effectiveStatus === "Closed"
    ) {
      return res.status(400).json({
        message: `This session is ${effectiveStatus.toLowerCase()} and cannot be edited.`
      });
    }
    // ------------------------------------------
    // Check selected skill
    // ------------------------------------------
    const skillResult = await pool
      .request()
      .input("skillId", sql.Int, skillId)
      .query(`
        SELECT SkillID
        FROM Skills
        WHERE SkillID = @skillId
      `);

    if (skillResult.recordset.length === 0) {
      return res.status(404).json({
        message: "Skill not found."
      });
    }

    // ------------------------------------------
    // Check teacher owns selected skill
    // ------------------------------------------
    const teacherSkill = await pool
      .request()
      .input("userId", sql.Int, req.user.userId)
      .input("skillId", sql.Int, skillId)
      .query(`
        SELECT UserSkillID
        FROM UserSkills
        WHERE UserID = @userId
          AND SkillID = @skillId
          AND SkillType = 'Teach'
      `);

    if (teacherSkill.recordset.length === 0) {
      return res.status(403).json({
        message:
          "You can use only a skill that you teach."
      });
    }

    // ------------------------------------------
    // Update session
    // ------------------------------------------
    const result = await pool
      .request()
      .input("sessionId", sql.Int, id)
      .input("skillId", sql.Int, skillId)
      .input("title", sql.NVarChar(150), title.trim())
      .input(
        "description",
        sql.NVarChar(1000),
        description ? description.trim() : null
      )
      .input(
        "sessionDate",
        sql.NVarChar(20),
        sessionDate
      )
      .input(
        "startTime",
        sql.NVarChar(20),
        startTime
      )
      .input(
        "endTime",
        sql.NVarChar(20),
        endTime
      )
      .input(
        "maxParticipants",
        sql.Int,
        participants
      )

      .query(`
        UPDATE Sessions

        SET
          SkillID = @skillId,
          Title = @title,
          Description = @description,
          SessionDate = CAST(@sessionDate AS DATE),
          StartTime = CAST(@startTime AS TIME),
          EndTime = CAST(@endTime AS TIME),
          MaxParticipants = @maxParticipants,
          

        OUTPUT
          INSERTED.SessionID,
          INSERTED.TeacherID,
          INSERTED.SkillID,
          INSERTED.Title,
          INSERTED.Description,
          INSERTED.SessionDate,
          INSERTED.StartTime,
          INSERTED.EndTime,
          INSERTED.MaxParticipants,
          INSERTED.Status,
          INSERTED.CreatedAt

        WHERE SessionID = @sessionId
      `);

    // ==========================================
    // NOTIFY ENROLLED STUDENTS
    // ==========================================

    const studentsResult = await pool
      .request()
      .input("sessionId", sql.Int, id)
      .query(`
        SELECT DISTINCT
          StudentID
        FROM Enrollments
        WHERE SessionID = @sessionId
          AND Status IN ('Pending', 'Accepted')
      `);

    // ------------------------------------------
    // SEND SESSION UPDATED NOTIFICATION
    // ------------------------------------------
    for (const student of studentsResult.recordset) {
      await sendNotification(
        student.StudentID,
        "Session Updated",
        `The session "${title.trim()}" has been updated by the teacher.`,
        "Session"
      );
    }

    return res.status(200).json({
      message: "Session updated successfully!",
      session: result.recordset[0]
    });

  } catch (error) {
    console.error("Update session error:");
    console.error(error.message);

    return res.status(500).json({
      message: "Server error while updating session."
    });
  }
};

const deleteSession = async (req, res) => {
  try {
    const { id } = req.params;

    const pool = await connectDB();

    // Get session details and verify ownership
    const sessionResult = await pool
      .request()
      .input("sessionId", sql.Int, id)
      .input("teacherId", sql.Int, req.user.userId)
      .query(`
    SELECT
      SessionID,
      Title,
      Status,
      SessionDate,
      StartTime,
      EndTime
    FROM Sessions
    WHERE SessionID = @sessionId
      AND TeacherID = @teacherId
  `);

    if (sessionResult.recordset.length === 0) {
      return res.status(404).json({
        message: "Session not found or you are not authorized."
      });
    }


    const session = sessionResult.recordset[0];

    let effectiveStatus = session.Status;

    // ==========================================
    // CHECK IF SESSION IS ALREADY COMPLETED
    // ==========================================
    const sessionEndDateTime = new Date(
      `${session.SessionDate.toISOString().split("T")[0]}T${session.EndTime}`
    );

    if (
      session.Status === "Open" &&
      sessionEndDateTime < new Date()
    ) {
      effectiveStatus = "Completed";
    }

    // ==========================================
    // PREVENT INVALID CANCELLATION
    // ==========================================
    if (
      effectiveStatus === "Cancelled" ||
      effectiveStatus === "Completed" ||
      effectiveStatus === "Closed"
    ) {
      return res.status(400).json({
        message:
          `This session is ${effectiveStatus.toLowerCase()} and cannot be cancelled.`
      });
    }

    // Get students who have active enrollment requests
    const studentsResult = await pool
      .request()
      .input("sessionId", sql.Int, id)
      .query(`
        SELECT DISTINCT
          StudentID
        FROM Enrollments
        WHERE SessionID = @sessionId
          AND Status IN ('Pending', 'Accepted')
      `);

    // Instead of physically deleting the session,
    // mark it as Cancelled.
    const updateResult = await pool
      .request()
      .input("sessionId", sql.Int, id)
      .input("teacherId", sql.Int, req.user.userId)
      .query(`
        UPDATE Sessions
        SET Status = 'Cancelled'
        OUTPUT
          INSERTED.SessionID,
          INSERTED.Status
        WHERE SessionID = @sessionId
          AND TeacherID = @teacherId
      `);

    // ==========================================
    // CANCEL ACTIVE ENROLLMENTS
    // ==========================================
    await pool
      .request()
      .input("sessionId", sql.Int, id)
      .query(`
    UPDATE Enrollments
    SET Status = 'Cancelled'
    WHERE SessionID = @sessionId
      AND Status IN ('Pending', 'Accepted')
  `);
    if (updateResult.recordset.length === 0) {
      return res.status(400).json({
        message: "Session could not be cancelled."
      });
    }

    await pool
      .request()
      .input("sessionId", sql.Int, id)
      .query(`
    UPDATE Enrollments
    SET Status = 'Cancelled'
    WHERE SessionID = @sessionId
      AND Status IN ('Pending', 'Accepted')
  `);
    // Notify students
    for (const student of studentsResult.recordset) {
      await sendNotification(
        student.StudentID,
        "Session Cancelled",
        `The session "${session.Title}" has been cancelled by the teacher.`,
        "Session"
      );
    }

    return res.status(200).json({
      message: "Session cancelled successfully.",
      session: updateResult.recordset[0]
    });

  } catch (error) {
    console.error("Cancel session error:");
    console.error(error.message);

    return res.status(500).json({
      message: "Server error while cancelling session."
    });
  }
};

// ==========================================
// EXPORT CONTROLLERS
// ==========================================
module.exports = {
  getSessions,
  getSessionById,
  createSession,
  updateSession,
  deleteSession
};
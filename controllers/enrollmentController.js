const { sql, connectDB } = require("../database/db");
const { sendNotification } = require("../utils/notificationService");


// ==========================================
// SESSION DATE/TIME HELPER
// ==========================================
const getSessionStartDateTime = (sessionDate, startTime) => {
  if (!sessionDate || !startTime) {
    return null;
  }

  const dateString =
    sessionDate instanceof Date
      ? sessionDate.toISOString().substring(0, 10)
      : String(sessionDate).substring(0, 10);

  const timeString =
    startTime instanceof Date
      ? startTime.toISOString().substring(11, 19)
      : String(startTime).substring(0, 8);

  const result = new Date(
    `${dateString}T${timeString}`
  );

  if (isNaN(result.getTime())) {
    return null;
  }

  return result;
};


// ==========================================
// ENROLL IN SESSION
// ==========================================
const enrollInSession = async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        message: "Session ID is required."
      });
    }

    const pool = await connectDB();

    // GET SESSION DETAILS
    const sessionResult = await pool
      .request()
      .input("sessionId", sql.Int, sessionId)
      .query(`
        SELECT
          s.SessionID,
          s.TeacherID,
          s.MaxParticipants,
          s.Status,
          s.SessionDate,
          s.StartTime,
          s.EndTime,
          s.Title,

          (
            SELECT COUNT(*)
            FROM Enrollments e
            WHERE e.SessionID = s.SessionID
            AND e.Status IN ('Pending', 'Accepted')
          ) AS EnrolledCount

        FROM Sessions s
        WHERE s.SessionID = @sessionId
      `);

    if (sessionResult.recordset.length === 0) {
      return res.status(404).json({
        message: "Session not found."
      });
    }

    const session = sessionResult.recordset[0];

    // PREVENT TEACHER ENROLLING IN OWN SESSION
    if (
      Number(session.TeacherID) ===
      Number(req.user.userId)
    ) {
      return res.status(400).json({
        message: "You cannot enroll in your own session."
      });
    }

    // CHECK SESSION STATUS
    if (session.Status !== "Open") {
      return res.status(400).json({
        message:
          session.Status === "Closed"
            ? "This session is closed."
            : session.Status === "Completed"
              ? "This session has already been completed."
              : "This session is not available for enrollment."
      });
    }

    // CHECK SESSION DATE AND TIME
    const sessionDateTime =
      getSessionStartDateTime(
        session.SessionDate,
        session.StartTime
      );

    if (!sessionDateTime) {
      return res.status(400).json({
        message:
          "Unable to determine the session date and time."
      });
    }

    if (sessionDateTime <= new Date()) {
      return res.status(400).json({
        message:
          "You cannot enroll in a session that has already started."
      });
    }

    // CHECK MAX PARTICIPANTS
    const enrolledCount =
      Number(session.EnrolledCount) || 0;

    const maxParticipants =
      Number(session.MaxParticipants) || 0;

    if (enrolledCount >= maxParticipants) {
      return res.status(400).json({
        message:
          "This session is already full."
      });
    }

    // CHECK EXISTING ENROLLMENT
    const existingEnrollment = await pool
      .request()
      .input(
        "studentId",
        sql.Int,
        req.user.userId
      )
      .input(
        "sessionId",
        sql.Int,
        sessionId
      )
      .query(`
        SELECT
          EnrollmentID,
          Status
        FROM Enrollments
        WHERE StudentID = @studentId
        AND SessionID = @sessionId
      `);

    if (existingEnrollment.recordset.length > 0) {
      const existing =
        existingEnrollment.recordset[0];

      // ALLOW RE-ENROLLMENT AFTER CANCELLATION
      if (existing.Status === "Cancelled") {
        const result = await pool
          .request()
          .input(
            "enrollmentId",
            sql.Int,
            existing.EnrollmentID
          )
          .query(`
            UPDATE Enrollments
            SET
              Status = 'Pending',
              EnrolledAt = GETDATE()
            OUTPUT
              INSERTED.EnrollmentID,
              INSERTED.StudentID,
              INSERTED.SessionID,
              INSERTED.Status,
              INSERTED.EnrolledAt
            WHERE EnrollmentID = @enrollmentId
          `);

        // NOTIFY TEACHER
        await sendNotification(
          session.TeacherID,
          "New Enrollment Request",
          "A student has requested to join your session: " +
          session.Title,
          "Enrollment"
        );

        return res.status(201).json({
          message:
            "Enrollment request submitted successfully!",
          enrollment: result.recordset[0]
        });
      }

      return res.status(400).json({
        message:
          `You have already enrolled in this session. Current status: ${existing.Status}.`
      });
    }

    // CREATE NEW ENROLLMENT
    const result = await pool
      .request()
      .input(
        "studentId",
        sql.Int,
        req.user.userId
      )
      .input(
        "sessionId",
        sql.Int,
        sessionId
      )
      .input(
        "status",
        sql.NVarChar(20),
        "Pending"
      )
      .query(`
        INSERT INTO Enrollments
        (
          StudentID,
          SessionID,
          Status,
          EnrolledAt
        )
        OUTPUT
          INSERTED.EnrollmentID,
          INSERTED.StudentID,
          INSERTED.SessionID,
          INSERTED.Status,
          INSERTED.EnrolledAt
        VALUES
        (
          @studentId,
          @sessionId,
          @status,
          GETDATE()
        )
      `);

    // NOTIFY TEACHER
    await sendNotification(
      session.TeacherID,
      "New Enrollment Request",
      "A student has requested to join your session: " +
      session.Title,
      "Enrollment"
    );

    return res.status(201).json({
      message:
        "Enrollment request submitted successfully!",
      enrollment: result.recordset[0]
    });

  } catch (error) {
    console.error("Enroll in session error:");
    console.error(error.message);

    return res.status(500).json({
      message:
        "Server error while enrolling in session."
    });
  }
};

const getMyEnrollments = async (req, res) => {
  try {
    const pool = await connectDB();

    const result = await pool
      .request()
      .input("studentId", sql.Int, req.user.userId)
      .query(`
        SELECT
          e.EnrollmentID,
          e.StudentID,
          e.SessionID,
          e.Status,
          e.EnrolledAt,

          s.Title,
          s.Description,
          s.SessionDate,
          s.StartTime,
          s.EndTime,
          s.MaxParticipants,
          s.Status AS SessionStatus,

          sk.SkillName,

          u.Name AS TeacherName,
          u.Email AS TeacherEmail

        FROM Enrollments e

        INNER JOIN Sessions s
          ON e.SessionID = s.SessionID

        INNER JOIN Skills sk
          ON s.SkillID = sk.SkillID

        INNER JOIN Users u
          ON s.TeacherID = u.UserID

        WHERE e.StudentID = @studentId

        ORDER BY e.EnrolledAt DESC
      `);

    return res.status(200).json({
      enrollments: result.recordset
    });

  } catch (error) {
    console.error("Get my enrollments error:");
    console.error(error.message);

    return res.status(500).json({
      message: "Server error while fetching enrollments."
    });
  }
};


// ==========================================
// GET SESSION ENROLLMENTS
// ==========================================
const getSessionEnrollments = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const pool = await connectDB();

    // CHECK SESSION OWNER
    const sessionResult = await pool
      .request()
      .input(
        "sessionId",
        sql.Int,
        sessionId
      )
      .query(`
        SELECT TeacherID
        FROM Sessions
        WHERE SessionID = @sessionId
      `);

    if (sessionResult.recordset.length === 0) {
      return res.status(404).json({
        message: "Session not found."
      });
    }

    const session =
      sessionResult.recordset[0];

    if (
      Number(session.TeacherID) !==
      Number(req.user.userId) &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        message:
          "You are not allowed to view these enrollments."
      });
    }

    const result = await pool
      .request()
      .input(
        "sessionId",
        sql.Int,
        sessionId
      )
      .query(`
        SELECT
          e.EnrollmentID,
          e.SessionID,
          e.StudentID,
          u.Name AS StudentName,
          u.Email AS StudentEmail,
          e.Status,
          e.EnrolledAt

        FROM Enrollments e

        INNER JOIN Users u
          ON e.StudentID = u.UserID

        WHERE e.SessionID = @sessionId

        ORDER BY e.EnrolledAt ASC
      `);

    return res.status(200).json({
      enrollments: result.recordset
    });

  } catch (error) {
    console.error(
      "Get session enrollments error:"
    );

    console.error(error.message);

    return res.status(500).json({
      message:
        "Server error while fetching session enrollments."
    });
  }
};


// ==========================================
// ACCEPT / REJECT ENROLLMENT
// ==========================================
const updateEnrollmentStatus = async (
  req,
  res
) => {
  try {
    const enrollmentId = req.params.id;
    const { status } = req.body;

    // ==========================================
    // VALIDATE STATUS
    // ==========================================
    if (
      !status ||
      !["Accepted", "Rejected"].includes(status)
    ) {
      return res.status(400).json({
        message:
          "Status must be Accepted or Rejected."
      });
    }

    const pool = await connectDB();

    // ==========================================
    // GET ENROLLMENT + SESSION DETAILS
    // ==========================================
    const enrollmentResult = await pool
      .request()
      .input(
        "EnrollmentID",
        sql.Int,
        enrollmentId
      )
      .query(`
        SELECT
          e.EnrollmentID,
          e.StudentID,
          e.SessionID,
          e.Status,

          s.TeacherID,
          s.MaxParticipants,
          s.Status AS SessionStatus,
          s.SessionDate,
          s.StartTime,
          s.EndTime,
          s.Title

        FROM Enrollments e

        INNER JOIN Sessions s
          ON e.SessionID = s.SessionID

        WHERE e.EnrollmentID = @EnrollmentID
      `);

    // ==========================================
    // CHECK ENROLLMENT EXISTS
    // ==========================================
    if (
      enrollmentResult.recordset.length === 0
    ) {
      return res.status(404).json({
        message: "Enrollment not found."
      });
    }

    const enrollment =
      enrollmentResult.recordset[0];

    // ==========================================
    // VERIFY TEACHER
    // ==========================================
    if (
      Number(enrollment.TeacherID) !==
      Number(req.user.userId)
    ) {
      return res.status(403).json({
        message:
          "You are not allowed to manage this enrollment."
      });
    }

    // ==========================================
    // CHECK CURRENT ENROLLMENT STATUS
    // ==========================================
    if (enrollment.Status !== "Pending") {
      return res.status(400).json({
        message:
          `This enrollment is already ${enrollment.Status}.`
      });
    }

    // ==========================================
    // CHECK SESSION STATUS
    // ==========================================
    let effectiveSessionStatus =
      enrollment.SessionStatus;

    // Automatically detect completed session
    const sessionEndDateTime =
      getSessionStartDateTime(
        enrollment.SessionDate,
        enrollment.EndTime
      );

    if (
      enrollment.SessionStatus === "Open" &&
      sessionEndDateTime &&
      sessionEndDateTime < new Date()
    ) {
      effectiveSessionStatus = "Completed";
    }

    // ==========================================
    // BLOCK CANCELLED / COMPLETED / CLOSED
    // ==========================================
    if (
      effectiveSessionStatus === "Cancelled" ||
      effectiveSessionStatus === "Completed" ||
      effectiveSessionStatus === "Closed"
    ) {
      return res.status(400).json({
        message:
          `This session is ${effectiveSessionStatus.toLowerCase()}. Enrollment status cannot be changed.`
      });
    }

    // ==========================================
    // REJECTION
    // ==========================================
    if (status === "Rejected") {

      await pool
        .request()
        .input(
          "EnrollmentID",
          sql.Int,
          enrollmentId
        )
        .input(
          "Status",
          sql.NVarChar(20),
          "Rejected"
        )
        .query(`
          UPDATE Enrollments
          SET Status = @Status

          WHERE EnrollmentID = @EnrollmentID
        `);

      // ==========================================
      // NOTIFY STUDENT
      // ==========================================
      await sendNotification(
        enrollment.StudentID,
        "Enrollment Rejected",
        "Your enrollment request for the session \"" +
        enrollment.Title +
        "\" has been rejected.",
        "Enrollment"
      );

      return res.status(200).json({
        message:
          "Enrollment rejected successfully."
      });
    }


    // ==========================================
    // ACCEPTANCE VALIDATION WITH TRANSACTION
    // ==========================================

    const transaction = new sql.Transaction(pool);

    await transaction.begin(
      sql.ISOLATION_LEVEL.SERIALIZABLE
    );

    try {
      // Lock the session row to prevent concurrent
      // acceptance requests exceeding capacity.
      const lockedSessionResult = await new sql.Request(transaction)
        .input("SessionID", sql.Int, enrollment.SessionID)
        .query(`
          SELECT
            SessionID,
            Status,
            SessionDate,
            StartTime,
            EndTime,
            MaxParticipants
          FROM Sessions WITH (UPDLOCK, HOLDLOCK)
          WHERE SessionID = @SessionID
        `);

      if (lockedSessionResult.recordset.length === 0) {
        await transaction.rollback();

        return res.status(404).json({
          message: "Session not found."
        });
      }

      const lockedSession = lockedSessionResult.recordset[0];

      // Recheck session status inside the transaction.
      let effectiveStatus = lockedSession.Status;

      const endDateTime = getSessionStartDateTime(
        lockedSession.SessionDate,
        lockedSession.EndTime
      );

      if (
        lockedSession.Status === "Open" &&
        endDateTime &&
        endDateTime < new Date()
      ) {
        effectiveStatus = "Completed";
      }

      if (effectiveStatus !== "Open") {
        await transaction.rollback();

        return res.status(400).json({
          message:
            `This session is ${effectiveStatus.toLowerCase()} and cannot accept enrollments.`
        });
      }

      // Check the session start time.
      const startDateTime = getSessionStartDateTime(
        lockedSession.SessionDate,
        lockedSession.StartTime
      );

      if (!startDateTime) {
        await transaction.rollback();

        return res.status(400).json({
          message: "Unable to determine the session date and time."
        });
      }

      if (startDateTime <= new Date()) {
        await transaction.rollback();

        return res.status(400).json({
          message: "You cannot accept an enrollment after the session has started."
        });
      }

      // Count accepted students while holding the session lock.
      const countResult = await new sql.Request(transaction)
        .input("SessionID", sql.Int, enrollment.SessionID)
        .query(`
          SELECT COUNT(*) AS AcceptedCount
          FROM Enrollments
          WHERE SessionID = @SessionID
            AND Status = 'Accepted'
        `);

      const acceptedCount =
        Number(countResult.recordset[0].AcceptedCount) || 0;

      const maxParticipants =
        Number(lockedSession.MaxParticipants) || 0;

      if (acceptedCount >= maxParticipants) {
        await transaction.rollback();

        return res.status(400).json({
          message: "This session is already full."
        });
      }

      // Accept only if the enrollment is still Pending.
      const updateResult = await new sql.Request(transaction)
        .input("EnrollmentID", sql.Int, enrollmentId)
        .query(`
          UPDATE Enrollments
          SET Status = 'Accepted'
          WHERE EnrollmentID = @EnrollmentID
            AND Status = 'Pending'
        `);

      if (updateResult.rowsAffected[0] === 0) {
        await transaction.rollback();

        return res.status(400).json({
          message: "This enrollment is no longer pending."
        });
      }

      await transaction.commit();

    } catch (transactionError) {
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        console.error("Rollback error:", rollbackError.message);
      }

      throw transactionError;
    }
    await sendNotification(
      enrollment.StudentID,
      "Enrollment Accepted",
      "Your enrollment request for the session \"" +
      enrollment.Title +
      "\" has been accepted.",
      "Enrollment"
    );

    return res.status(200).json({
      message:
        "Enrollment accepted successfully."
    });

  } catch (error) {
    console.error(
      "Update enrollment status error:"
    );

    console.error(error.message);

    return res.status(500).json({
      message:
        "Server error while updating enrollment status."
    });
  }
};

// ==========================================
// CANCEL ENROLLMENT
// ==========================================
const cancelEnrollment = async (req, res) => {
  try {
    const { id } = req.params;

    const pool = await connectDB();

    // ------------------------------------------
    // Get enrollment + session details
    // ------------------------------------------
    const enrollmentResult = await pool
      .request()
      .input("enrollmentId", sql.Int, id)
      .input("studentId", sql.Int, req.user.userId)
      .query(`
        SELECT
          e.EnrollmentID,
          e.StudentID,
          e.SessionID,
          e.Status,
          s.TeacherID,
          s.Title
        FROM Enrollments e

        INNER JOIN Sessions s
          ON e.SessionID = s.SessionID

        WHERE e.EnrollmentID = @enrollmentId
          AND e.StudentID = @studentId
      `);

    // ------------------------------------------
    // Check enrollment exists
    // ------------------------------------------
    if (enrollmentResult.recordset.length === 0) {
      return res.status(404).json({
        message: "Enrollment not found."
      });
    }

    const enrollment = enrollmentResult.recordset[0];

    // ------------------------------------------
    // Only Pending or Accepted can be cancelled
    // ------------------------------------------
    if (
      enrollment.Status !== "Pending" &&
      enrollment.Status !== "Accepted"
    ) {
      return res.status(400).json({
        message:
          "Only pending or accepted enrollments can be cancelled."
      });
    }

    // ------------------------------------------
    // Update status to Cancelled
    // ------------------------------------------
    const updateResult = await pool
      .request()
      .input("enrollmentId", sql.Int, id)
      .input("studentId", sql.Int, req.user.userId)
      .query(`
        UPDATE Enrollments

        SET Status = 'Cancelled'

        OUTPUT
          INSERTED.EnrollmentID,
          INSERTED.Status

        WHERE EnrollmentID = @enrollmentId
          AND StudentID = @studentId
          AND Status IN ('Pending', 'Accepted')
      `);

    if (updateResult.recordset.length === 0) {
      return res.status(400).json({
        message: "Enrollment could not be cancelled."
      });
    }

    // ==========================================
    // NOTIFY TEACHER
    // ==========================================

    await sendNotification(
      enrollment.TeacherID,
      "Enrollment Cancelled",
      `A student has cancelled their enrollment for the session "${enrollment.Title}".`,
      "Enrollment"
    );

    return res.status(200).json({
      message: "Enrollment cancelled successfully.",
      enrollment: updateResult.recordset[0]
    });

  } catch (error) {
    console.error("Cancel enrollment error:");
    console.error(error.message);

    return res.status(500).json({
      message:
        "Server error while cancelling enrollment."
    });
  }
};


module.exports = {
  enrollInSession,
  getMyEnrollments,
  getSessionEnrollments,
  updateEnrollmentStatus,
  cancelEnrollment
};
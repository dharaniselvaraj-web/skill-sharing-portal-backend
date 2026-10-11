const express = require("express");

const {
  enrollInSession,
  getMyEnrollments,
  getSessionEnrollments,
  updateEnrollmentStatus,
  cancelEnrollment
} = require("../controllers/enrollmentController");

const verifyToken = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", verifyToken, enrollInSession);

router.get("/my", verifyToken, getMyEnrollments);

router.get(
  "/session/:sessionId",
  verifyToken,
  getSessionEnrollments
);

router.put(
  "/:id/status",
  verifyToken,
  updateEnrollmentStatus
);

router.delete(
  "/:id",
  verifyToken,
  cancelEnrollment
);

module.exports = router;
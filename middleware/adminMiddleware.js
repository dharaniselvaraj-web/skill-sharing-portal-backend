
const verifyAdmin = (req, res, next) => {
  if (
    !req.user ||
    String(req.user.role || "").toLowerCase() !== "admin"
  ) {
    return res.status(403).json({
      message: "Access denied. Admin permission required."
    });
  }

  next();
};

module.exports = verifyAdmin;

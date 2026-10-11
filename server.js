const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http");
const { Server } = require("socket.io");

const authRoutes = require("./routes/authRoutes");
const { connectDB } = require("./database/db");
const skillRoutes = require("./routes/skillRoutes");
const userSkillRoutes = require("./routes/userSkillRoutes");
const sessionRoutes = require("./routes/sessionRoutes");
const enrollmentRoutes = require("./routes/enrollmentRoutes");
const feedbackRoutes = require("./routes/feedbackRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const badgeRoutes = require("./routes/badgeRoutes");
const adminRoutes = require("./routes/adminRoutes");

dotenv.config();

const app = express();
const server = http.createServer(app);

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

app.get("/", (req, res) => {
  res.json({
    message: "Skill Sharing Portal Backend is running!"
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/skills", skillRoutes);
app.use("/api/user-skills", userSkillRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/enrollments", enrollmentRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/badges", badgeRoutes);
app.use("/api/admin", adminRoutes);

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

connectDB()
  .then(() => {
    console.log("✅ Database connection is ready.");
  })
  .catch((error) => {
    console.error("❌ Database connection failed.");
    console.error(error.message);
  });

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
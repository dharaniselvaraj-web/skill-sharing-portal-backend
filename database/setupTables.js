const sql = require("mssql/msnodesqlv8");

const config = {
  server: "localhost",
  database: "SkillSharingPortal",
  driver: "ODBC Driver 18 for SQL Server",
  options: {
    trustedConnection: true,
    trustServerCertificate: true
  }
};

async function setupTables() {
  let pool;

  try {
    console.log("Connecting to SkillSharingPortal database...");

    pool = await sql.connect(config);

    console.log("Database connected successfully!");

    // ==========================================
    // 1. USERS
    // ==========================================
    await pool.request().query(`
      IF OBJECT_ID('Users', 'U') IS NULL
      BEGIN
        CREATE TABLE Users (
          UserID INT IDENTITY(1,1) PRIMARY KEY,
          Name NVARCHAR(100) NOT NULL,
          Email NVARCHAR(150) NOT NULL UNIQUE,
          PasswordHash NVARCHAR(255) NULL,
          GoogleID NVARCHAR(255) NULL,
          Role NVARCHAR(20) NOT NULL DEFAULT 'student',
          Status NVARCHAR(20) NOT NULL DEFAULT 'Active',
          CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE()
        );
      END
    `);

    console.log("✅ Users table ready");


    // ==========================================
    // 2. SKILLS
    // ==========================================
    await pool.request().query(`
      IF OBJECT_ID('Skills', 'U') IS NULL
      BEGIN
        CREATE TABLE Skills (
          SkillID INT IDENTITY(1,1) PRIMARY KEY,
          SkillName NVARCHAR(100) NOT NULL UNIQUE,
          Description NVARCHAR(500) NULL,
          CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE()
        );
      END
    `);

    console.log("✅ Skills table ready");


    // ==========================================
    // 3. USER SKILLS
    // ==========================================
    await pool.request().query(`
      IF OBJECT_ID('UserSkills', 'U') IS NULL
      BEGIN
        CREATE TABLE UserSkills (
          UserSkillID INT IDENTITY(1,1) PRIMARY KEY,
          UserID INT NOT NULL,
          SkillID INT NOT NULL,
          SkillType NVARCHAR(20) NOT NULL,
          CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),

          CONSTRAINT FK_UserSkills_Users
            FOREIGN KEY (UserID)
            REFERENCES Users(UserID),

          CONSTRAINT FK_UserSkills_Skills
            FOREIGN KEY (SkillID)
            REFERENCES Skills(SkillID),

          CONSTRAINT UQ_UserSkills
            UNIQUE (UserID, SkillID, SkillType)
        );
      END
    `);

    console.log("✅ UserSkills table ready");


    // ==========================================
    // 4. SESSIONS
    // ==========================================
    await pool.request().query(`
      IF OBJECT_ID('Sessions', 'U') IS NULL
      BEGIN
        CREATE TABLE Sessions (
          SessionID INT IDENTITY(1,1) PRIMARY KEY,
          TeacherID INT NOT NULL,
          SkillID INT NOT NULL,
          Title NVARCHAR(150) NOT NULL,
          Description NVARCHAR(1000) NULL,
          SessionDate DATE NOT NULL,
          StartTime TIME NOT NULL,
          EndTime TIME NOT NULL,
          MaxParticipants INT NOT NULL DEFAULT 10,
          Status NVARCHAR(20) NOT NULL DEFAULT 'Open',
          CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),

          CONSTRAINT FK_Sessions_Teacher
            FOREIGN KEY (TeacherID)
            REFERENCES Users(UserID),

          CONSTRAINT FK_Sessions_Skill
            FOREIGN KEY (SkillID)
            REFERENCES Skills(SkillID)
        );
      END
    `);

    console.log("✅ Sessions table ready");


    // ==========================================
    // 5. ENROLLMENTS
    // ==========================================
    await pool.request().query(`
      IF OBJECT_ID('Enrollments', 'U') IS NULL
      BEGIN
        CREATE TABLE Enrollments (
          EnrollmentID INT IDENTITY(1,1) PRIMARY KEY,
          SessionID INT NOT NULL,
          StudentID INT NOT NULL,
          Status NVARCHAR(20) NOT NULL DEFAULT 'Pending',
          EnrolledAt DATETIME2 NOT NULL DEFAULT GETDATE(),

          CONSTRAINT FK_Enrollments_Session
            FOREIGN KEY (SessionID)
            REFERENCES Sessions(SessionID),

          CONSTRAINT FK_Enrollments_Student
            FOREIGN KEY (StudentID)
            REFERENCES Users(UserID),

          CONSTRAINT UQ_Enrollment
            UNIQUE (SessionID, StudentID)
        );
      END
    `);

    console.log("✅ Enrollments table ready");


    // ==========================================
    // 6. FEEDBACK
    // ==========================================
    await pool.request().query(`
      IF OBJECT_ID('Feedback', 'U') IS NULL
      BEGIN
        CREATE TABLE Feedback (
          FeedbackID INT IDENTITY(1,1) PRIMARY KEY,
          EnrollmentID INT NOT NULL,
          StudentID INT NOT NULL,
          SessionID INT NOT NULL,
          Rating INT NOT NULL,
          Comment NVARCHAR(1000) NULL,
          CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),

          CONSTRAINT FK_Feedback_Enrollment
            FOREIGN KEY (EnrollmentID)
            REFERENCES Enrollments(EnrollmentID),

          CONSTRAINT FK_Feedback_Student
            FOREIGN KEY (StudentID)
            REFERENCES Users(UserID),

          CONSTRAINT FK_Feedback_Session
            FOREIGN KEY (SessionID)
            REFERENCES Sessions(SessionID),

          CONSTRAINT CK_Feedback_Rating
            CHECK (Rating >= 1 AND Rating <= 5),

          CONSTRAINT UQ_Feedback_Enrollment
            UNIQUE (EnrollmentID)
        );
      END
    `);

    console.log("✅ Feedback table ready");


    // ==========================================
    // 7. CHAT GROUPS
    // ==========================================
    await pool.request().query(`
      IF OBJECT_ID('ChatGroups', 'U') IS NULL
      BEGIN
        CREATE TABLE ChatGroups (
          GroupID INT IDENTITY(1,1) PRIMARY KEY,
          SessionID INT NOT NULL UNIQUE,
          GroupName NVARCHAR(150) NOT NULL,
          CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),

          CONSTRAINT FK_ChatGroups_Session
            FOREIGN KEY (SessionID)
            REFERENCES Sessions(SessionID)
        );
      END
    `);

    console.log("✅ ChatGroups table ready");


    // ==========================================
    // 8. GROUP MEMBERS
    // ==========================================
    await pool.request().query(`
      IF OBJECT_ID('GroupMembers', 'U') IS NULL
      BEGIN
        CREATE TABLE GroupMembers (
          GroupMemberID INT IDENTITY(1,1) PRIMARY KEY,
          GroupID INT NOT NULL,
          UserID INT NOT NULL,
          JoinedAt DATETIME2 NOT NULL DEFAULT GETDATE(),

          CONSTRAINT FK_GroupMembers_Group
            FOREIGN KEY (GroupID)
            REFERENCES ChatGroups(GroupID),

          CONSTRAINT FK_GroupMembers_User
            FOREIGN KEY (UserID)
            REFERENCES Users(UserID),

          CONSTRAINT UQ_GroupMember
            UNIQUE (GroupID, UserID)
        );
      END
    `);

    console.log("✅ GroupMembers table ready");


    // ==========================================
    // 9. MESSAGES
    // ==========================================
    await pool.request().query(`
      IF OBJECT_ID('Messages', 'U') IS NULL
      BEGIN
        CREATE TABLE Messages (
          MessageID INT IDENTITY(1,1) PRIMARY KEY,
          GroupID INT NOT NULL,
          SenderID INT NOT NULL,
          MessageText NVARCHAR(MAX) NULL,
          SentAt DATETIME2 NOT NULL DEFAULT GETDATE(),

          CONSTRAINT FK_Messages_Group
            FOREIGN KEY (GroupID)
            REFERENCES ChatGroups(GroupID),

          CONSTRAINT FK_Messages_Sender
            FOREIGN KEY (SenderID)
            REFERENCES Users(UserID)
        );
      END
    `);

    console.log("✅ Messages table ready");


    // ==========================================
    // 10. SHARED RESOURCES
    // ==========================================
    await pool.request().query(`
      IF OBJECT_ID('SharedResources', 'U') IS NULL
      BEGIN
        CREATE TABLE SharedResources (
          ResourceID INT IDENTITY(1,1) PRIMARY KEY,
          GroupID INT NOT NULL,
          UserID INT NOT NULL,
          Title NVARCHAR(200) NOT NULL,
          ResourceURL NVARCHAR(1000) NULL,
          ResourceType NVARCHAR(50) NULL,
          CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),

          CONSTRAINT FK_Resources_Group
            FOREIGN KEY (GroupID)
            REFERENCES ChatGroups(GroupID),

          CONSTRAINT FK_Resources_User
            FOREIGN KEY (UserID)
            REFERENCES Users(UserID)
        );
      END
    `);

    console.log("✅ SharedResources table ready");


    // ==========================================
    // 11. NOTIFICATIONS
    // ==========================================
    await pool.request().query(`
      IF OBJECT_ID('Notifications', 'U') IS NULL
      BEGIN
        CREATE TABLE Notifications (
          NotificationID INT IDENTITY(1,1) PRIMARY KEY,
          UserID INT NOT NULL,
          Title NVARCHAR(200) NOT NULL,
          Message NVARCHAR(1000) NOT NULL,
          Type NVARCHAR(50) NULL,
          IsRead BIT NOT NULL DEFAULT 0,
          CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),

          CONSTRAINT FK_Notifications_User
            FOREIGN KEY (UserID)
            REFERENCES Users(UserID)
        );
      END
    `);

    console.log("✅ Notifications table ready");


    // ==========================================
    // 12. BADGES
    // ==========================================
    await pool.request().query(`
      IF OBJECT_ID('Badges', 'U') IS NULL
      BEGIN
        CREATE TABLE Badges (
          BadgeID INT IDENTITY(1,1) PRIMARY KEY,
          BadgeName NVARCHAR(100) NOT NULL UNIQUE,
          Description NVARCHAR(500) NULL,
          Icon NVARCHAR(255) NULL
        );
      END
    `);

    console.log("✅ Badges table ready");


    // ==========================================
    // 13. USER BADGES
    // ==========================================
    await pool.request().query(`
      IF OBJECT_ID('UserBadges', 'U') IS NULL
      BEGIN
        CREATE TABLE UserBadges (
          UserBadgeID INT IDENTITY(1,1) PRIMARY KEY,
          BadgeID INT NOT NULL,
          UserID INT NOT NULL,
          AwardedAt DATETIME2 NOT NULL DEFAULT GETDATE(),

          CONSTRAINT FK_UserBadges_Badge
            FOREIGN KEY (BadgeID)
            REFERENCES Badges(BadgeID),

          CONSTRAINT FK_UserBadges_User
            FOREIGN KEY (UserID)
            REFERENCES Users(UserID),

          CONSTRAINT UQ_UserBadge
            UNIQUE (BadgeID, UserID)
        );
      END
    `);

    console.log("✅ UserBadges table ready");

    console.log("");
    console.log("🎉 All database tables are ready!");

  } catch (error) {
    console.error("❌ Table setup failed:");
    console.error(error.message);

  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

setupTables();
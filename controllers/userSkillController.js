const { sql, connectDB } = require("../database/db");

// ==========================================
// GET MY SKILLS
// ==========================================
const getMySkills = async (req, res) => {
  try {
    const pool = await connectDB();

    const result = await pool
      .request()
      .input("userId", sql.Int, req.user.userId)
      .query(`
        SELECT
          us.UserSkillID,
          us.UserID,
          us.SkillID,
          s.SkillName,
          s.Description,
          us.SkillType,
          us.CreatedAt
        FROM UserSkills us
        INNER JOIN Skills s
          ON us.SkillID = s.SkillID
        WHERE us.UserID = @userId
        ORDER BY s.SkillName ASC
      `);

    res.status(200).json({
      skills: result.recordset
    });

  } catch (error) {
    console.error("Get my skills error:");
    console.error(error.message);

    res.status(500).json({
      message: "Server error while fetching your skills."
    });
  }
};


// ==========================================
// ADD SKILL
// ==========================================
const addUserSkill = async (req, res) => {
  try {
    const { skillId, skillType } = req.body;

    if (!skillId || !skillType) {
      return res.status(400).json({
        message: "Skill ID and skill type are required."
      });
    }

    if (!["Teach", "Learn"].includes(skillType)) {
      return res.status(400).json({
        message: "Skill type must be Teach or Learn."
      });
    }

    const pool = await connectDB();

    // Check skill exists
    const skill = await pool
      .request()
      .input("skillId", sql.Int, skillId)
      .query(`
        SELECT SkillID, SkillName
        FROM Skills
        WHERE SkillID = @skillId
      `);

    if (skill.recordset.length === 0) {
      return res.status(404).json({
        message: "Skill not found."
      });
    }

    // Check duplicate
    const existing = await pool
      .request()
      .input("userId", sql.Int, req.user.userId)
      .input("skillId", sql.Int, skillId)
      .input("skillType", sql.NVarChar(20), skillType)
      .query(`
        SELECT UserSkillID
        FROM UserSkills
        WHERE UserID = @userId
          AND SkillID = @skillId
          AND SkillType = @skillType
      `);

    if (existing.recordset.length > 0) {
      return res.status(409).json({
        message: "This skill is already added."
      });
    }

    const result = await pool
      .request()
      .input("userId", sql.Int, req.user.userId)
      .input("skillId", sql.Int, skillId)
      .input("skillType", sql.NVarChar(20), skillType)
      .query(`
        INSERT INTO UserSkills
        (UserID, SkillID, SkillType)
        OUTPUT
          INSERTED.UserSkillID,
          INSERTED.UserID,
          INSERTED.SkillID,
          INSERTED.SkillType,
          INSERTED.CreatedAt
        VALUES
        (@userId, @skillId, @skillType)
      `);

    res.status(201).json({
      message: "Skill added successfully!",
      userSkill: result.recordset[0],
      skill: skill.recordset[0]
    });

  } catch (error) {
    console.error("Add user skill error:");
    console.error(error.message);

    res.status(500).json({
      message: "Server error while adding skill."
    });
  }
};


// ==========================================
// DELETE MY SKILL
// ==========================================
const deleteUserSkill = async (req, res) => {
  try {
    const { id } = req.params;

    const pool = await connectDB();

    const result = await pool
      .request()
      .input("userSkillId", sql.Int, id)
      .input("userId", sql.Int, req.user.userId)
      .query(`
        DELETE FROM UserSkills
        OUTPUT DELETED.UserSkillID
        WHERE UserSkillID = @userSkillId
          AND UserID = @userId
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({
        message: "Skill not found."
      });
    }

    res.status(200).json({
      message: "Skill removed successfully!"
    });

  } catch (error) {
    console.error("Delete user skill error:");
    console.error(error.message);

    res.status(500).json({
      message: "Server error while removing skill."
    });
  }
};


module.exports = {
  getMySkills,
  addUserSkill,
  deleteUserSkill
};
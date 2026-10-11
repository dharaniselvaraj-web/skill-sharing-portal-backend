const { sql, connectDB } = require("../database/db");

// =========================
// GET ALL SKILLS
// =========================
const getSkills = async (req, res) => {
  try {
    const pool = await connectDB();

    const result = await pool.request().query(`
      SELECT
        SkillID,
        SkillName,
        Description,
        CreatedAt
      FROM Skills
      ORDER BY SkillName ASC
    `);

    res.status(200).json({
      skills: result.recordset
    });

  } catch (error) {
    console.error("Get skills error:");
    console.error(error.message);

    res.status(500).json({
      message: "Server error while fetching skills."
    });
  }
};


// =========================
// GET SINGLE SKILL
// =========================
const getSkillById = async (req, res) => {
  try {
    const { id } = req.params;

    const pool = await connectDB();

    const result = await pool
      .request()
      .input("skillId", sql.Int, id)
      .query(`
        SELECT
          SkillID,
          SkillName,
          Description,
          CreatedAt
        FROM Skills
        WHERE SkillID = @skillId
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({
        message: "Skill not found."
      });
    }

    res.status(200).json({
      skill: result.recordset[0]
    });

  } catch (error) {
    console.error("Get skill error:");
    console.error(error.message);

    res.status(500).json({
      message: "Server error while fetching skill."
    });
  }
};


// =========================
// CREATE SKILL
// =========================
const createSkill = async (req, res) => {
  try {
    const { skillName, description } = req.body;

    if (!skillName) {
      return res.status(400).json({
        message: "Skill name is required."
      });
    }

    const pool = await connectDB();

    const existingSkill = await pool
      .request()
      .input("skillName", sql.NVarChar(100), skillName)
      .query(`
        SELECT SkillID
        FROM Skills
        WHERE SkillName = @skillName
      `);

    if (existingSkill.recordset.length > 0) {
      return res.status(409).json({
        message: "Skill already exists."
      });
    }

    const result = await pool
      .request()
      .input("skillName", sql.NVarChar(100), skillName)
      .input(
        "description",
        sql.NVarChar(500),
        description || null
      )
      .query(`
        INSERT INTO Skills
        (SkillName, Description)
        OUTPUT
          INSERTED.SkillID,
          INSERTED.SkillName,
          INSERTED.Description,
          INSERTED.CreatedAt
        VALUES
        (@skillName, @description)
      `);

    res.status(201).json({
      message: "Skill created successfully!",
      skill: result.recordset[0]
    });

  } catch (error) {
    console.error("Create skill error:");
    console.error(error.message);

    res.status(500).json({
      message: "Server error while creating skill."
    });
  }
};


// =========================
// UPDATE SKILL
// =========================
const updateSkill = async (req, res) => {
  try {
    const { id } = req.params;
    const { skillName, description } = req.body;

    if (!skillName) {
      return res.status(400).json({
        message: "Skill name is required."
      });
    }

    const pool = await connectDB();

    const result = await pool
      .request()
      .input("skillId", sql.Int, id)
      .input("skillName", sql.NVarChar(100), skillName)
      .input(
        "description",
        sql.NVarChar(500),
        description || null
      )
      .query(`
        UPDATE Skills
        SET
          SkillName = @skillName,
          Description = @description
        OUTPUT
          INSERTED.SkillID,
          INSERTED.SkillName,
          INSERTED.Description,
          INSERTED.CreatedAt
        WHERE SkillID = @skillId
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({
        message: "Skill not found."
      });
    }

    res.status(200).json({
      message: "Skill updated successfully!",
      skill: result.recordset[0]
    });

  } catch (error) {
    console.error("Update skill error:");
    console.error(error.message);

    res.status(500).json({
      message: "Server error while updating skill."
    });
  }
};


// =========================
// DELETE SKILL
// =========================
const deleteSkill = async (req, res) => {
  try {
    const { id } = req.params;

    const pool = await connectDB();

    const result = await pool
      .request()
      .input("skillId", sql.Int, id)
      .query(`
        DELETE FROM Skills
        OUTPUT DELETED.SkillID
        WHERE SkillID = @skillId
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({
        message: "Skill not found."
      });
    }

    res.status(200).json({
      message: "Skill deleted successfully!"
    });

  } catch (error) {
    console.error("Delete skill error:");
    console.error(error.message);

    res.status(500).json({
      message: "Skill cannot be deleted because it may be used by other records."
    });
  }
};


module.exports = {
  getSkills,
  getSkillById,
  createSkill,
  updateSkill,
  deleteSkill
};
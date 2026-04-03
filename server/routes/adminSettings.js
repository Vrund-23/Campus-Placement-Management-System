const router = require("express").Router();
const pool = require("../config/db");
const bcrypt = require("bcryptjs");
const authorization = require("../middleware/authorization");
const fs = require("fs");
const path = require("path");

// Middleware to check if the user is a TPO (Admin)
const isTPO = async (req, res, next) => {
  try {
    const userResult = await pool.query("SELECT role_id FROM users WHERE user_id = $1", [req.user.id]);
    if (userResult.rows.length === 0 || userResult.rows[0].role_id !== 4) { // 4 = tpo
      return res.status(403).json({ error: "Access denied: TPO role required" });
    }
    next();
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

// Initialize a new academic year
router.post("/init-year", [authorization, isTPO], async (req, res) => {
  try {
    const { academicYear, password } = req.body;
    
    // Verify TPO password
    if (!password) {
      return res.status(400).json({ error: "Password is required for sensitive operations." });
    }
    const tpoUser = await pool.query("SELECT password_hash FROM users WHERE user_id = $1", [req.user.id]);
    const validPassword = await bcrypt.compare(password, tpoUser.rows[0].password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: "Invalid password. Access denied." });
    }

    if (!academicYear || !/^\d{4}-\d{2}$/.test(academicYear)) {
      return res.status(400).json({ error: "Invalid academic year format. Use YYYY-YY (e.g., 2026-27)." });
    }

    const baseDataDir = path.join(__dirname, "../data");
    const subDirs = ["students", "TPCs", "TPFs"];
    
    const createdPaths = [];

    for (const subDir of subDirs) {
      const dirPath = path.join(baseDataDir, subDir, academicYear);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        createdPaths.push(`${subDir}/${academicYear}`);
      }
    }

    res.json({ 
      message: `Academic year ${academicYear} initialized successfully.`,
      details: createdPaths.length > 0 
        ? `Created folders: ${createdPaths.join(", ")}` 
        : "Folders already existed."
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

module.exports = router;

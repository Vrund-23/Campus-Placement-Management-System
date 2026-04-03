const router = require("express").Router();
const pool = require("../config/db");
const bcrypt = require("bcryptjs");
const authorization = require("../middleware/authorization");
const { sendTPCWelcomeEmail } = require("../utils/mailer");
const xlsx = require("xlsx");
const path = require("path");
const fs = require("fs");
const multer = require("multer");

// Configure Multer for TPC Excel Uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const { academicYear = '2025-26' } = req.query;
    const dir = path.join(__dirname, `../data/TPCs/${academicYear}/`);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, "TPC_List.xlsx");
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" || file.mimetype === "application/vnd.ms-excel") {
      cb(null, true);
    } else {
      cb(new Error("Only Excel files (.xlsx, .xls) are allowed"));
    }
  }
});

// Middleware to check if the user is a TPO
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

// Get all TPCs
router.get("/", [authorization, isTPO], async (req, res) => {
  try {
    const { academicYear = '2025-26' } = req.query;
    // Note: We might want to filter TPCs by year if we added academic_year to faculty_profiles or something,
    // but typically TPCs are global or based on current season. 
    // For now, returning all role_id = 2 users with their faculty profiles.
    const tpcs = await pool.query(
      `SELECT u.user_id, u.name, u.email, fp.employee_code as college_id, d.name as department_name, d.dept_id
       FROM users u
       JOIN faculty_profiles fp ON u.user_id = fp.user_id
       JOIN departments d ON fp.dept_id = d.dept_id
       WHERE u.role_id = 2` // 2 = tpc
    );
    res.json(tpcs.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// Upload TPC Excel File
router.post("/upload", [authorization, isTPO, upload.single("file")], async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    res.json({ message: "TPC List uploaded successfully", filename: req.file.filename });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// Sync TPCs from stored Excel file
router.post("/sync", [authorization, isTPO], async (req, res) => {
  try {
    const { academicYear = '2025-26' } = req.body;
    const excelPath = path.join(__dirname, `../data/TPCs/${academicYear}/`, "TPC_List.xlsx");
    
    if (!fs.existsSync(excelPath)) {
      return res.status(404).json({ 
        error: `TPC list for ${academicYear} not found.`,
        details: `Please ensure the file is uploaded first.`
      });
    }

    const workbook = xlsx.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const tpcsData = xlsx.utils.sheet_to_json(worksheet);

    if (tpcsData.length === 0) {
      return res.json({ message: "Excel is empty", results: [] });
    }

    // Fetch departments
    const deptResult = await pool.query("SELECT dept_id, name, code FROM departments");
    const depts = deptResult.rows;

    const results = [];

    for (const row of tpcsData) {
      const name = row.Name || row.name || row['Full Name'];
      const email = row.Email || row.email || row.mail_id || row.mail;
      const department = row.Department || row.department || row.dept || row.Branch;
      const college_id = row.college_id || row['College ID'] || row['Employee Code'] || row.id;

      if (!email || !name) continue;

      try {
        // Match department
        const dept = depts.find(d =>
          d.name.toLowerCase() === (department || "").toLowerCase() ||
          d.code.toLowerCase() === (department || "").toLowerCase()
        );

        if (!dept) {
          results.push({ name, email, status: "skipped", reason: `Department "${department}" not found` });
          continue;
        }

        const userCheck = await pool.query("SELECT user_id FROM users WHERE email = $1", [email]);
        
        if (userCheck.rows.length > 0) {
          const userId = userCheck.rows[0].user_id;
          // Update existing user/profile
          await pool.query("BEGIN");
          await pool.query("UPDATE users SET name = $1 WHERE user_id = $2", [name, userId]);
          await pool.query(
            "UPDATE faculty_profiles SET dept_id = $1, employee_code = $2 WHERE user_id = $3",
            [dept.dept_id, college_id || null, userId]
          );
          await pool.query("COMMIT");
          results.push({ name, email, status: "updated" });
        } else {
          // Create new TPC
          const rawPassword = `TPC@${Math.floor(1000 + Math.random() * 9000)}`;
          const salt = await bcrypt.genSalt(10);
          const hashedPassword = await bcrypt.hash(rawPassword, salt);

          await pool.query("BEGIN");
          const newUser = await pool.query(
            "INSERT INTO users (email, password_hash, role_id, name) VALUES ($1, $2, 2, $3) RETURNING user_id",
            [email, hashedPassword, name]
          );
          const userId = newUser.rows[0].user_id;
          await pool.query(
            "INSERT INTO faculty_profiles (user_id, dept_id, employee_code, designation) VALUES ($1, $2, $3, $4)",
            [userId, dept.dept_id, college_id || null, "TPC Coordinator"]
          );
          await pool.query("COMMIT");

          const emailResult = await sendTPCWelcomeEmail(email, name, rawPassword);
          results.push({ name, email, status: "created", emailSent: emailResult.success, rawPassword });
        }
      } catch (innerErr) {
        await pool.query("ROLLBACK");
        results.push({ name, email, status: "error", reason: innerErr.message });
      }
    }

    res.json({ message: "Sync complete", results });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// Create new TPC
router.post("/", [authorization, isTPO], async (req, res) => {
  try {
    const { name, email, department_id, college_id } = req.body;

    // Check if user already exists
    const userCheck = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (userCheck.rows.length > 0) {
      return res.status(400).json({ error: "User with this email already exists" });
    }

    // Generate random password (e.g., TPC@1234)
    const rawPassword = `TPC@${Math.floor(1000 + Math.random() * 9000)}`;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(rawPassword, salt);

    // Insert user
    const newUser = await pool.query(
      "INSERT INTO users (email, password_hash, role_id, name) VALUES ($1, $2, 2, $3) RETURNING user_id",
      [email, hashedPassword, name]
    );

    const userId = newUser.rows[0].user_id;

    // Insert faculty profile
    await pool.query(
      "INSERT INTO faculty_profiles (user_id, dept_id, employee_code, designation) VALUES ($1, $2, $3, $4)",
      [userId, department_id, college_id, "TPC Coordinator"]
    );

    // Send welcome email with credentials
    const emailResult = await sendTPCWelcomeEmail(email, name, rawPassword);

    res.json({
      message: "TPC created successfully",
      tpc: { name, email, rawPassword },
      emailSent: emailResult.success,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// Bulk create TPCs (from Excel upload)
router.post("/bulk", [authorization, isTPO], async (req, res) => {
  try {
    const { tpcs } = req.body; // Array of { name, email, department, college_id }
    if (!Array.isArray(tpcs) || tpcs.length === 0) {
      return res.status(400).json({ error: "No TPC data provided" });
    }

    // Fetch departments for name-to-id mapping
    const deptResult = await pool.query("SELECT dept_id, name, code FROM departments");
    const depts = deptResult.rows;

    const results = [];

    for (const tpc of tpcs) {
      try {
        // Check if user already exists
        const userCheck = await pool.query("SELECT * FROM users WHERE email = $1", [tpc.email]);
        if (userCheck.rows.length > 0) {
          results.push({ ...tpc, status: "skipped", reason: "Email already exists" });
          continue;
        }

        // Match department by name or code (case-insensitive)
        const dept = depts.find(d =>
          d.name.toLowerCase() === (tpc.department || "").toLowerCase() ||
          d.code.toLowerCase() === (tpc.department || "").toLowerCase()
        );
        if (!dept) {
          results.push({ ...tpc, status: "skipped", reason: `Department "${tpc.department}" not found` });
          continue;
        }

        // Generate password
        const rawPassword = `TPC@${Math.floor(1000 + Math.random() * 9000)}`;
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(rawPassword, salt);

        // Insert user
        const newUser = await pool.query(
          "INSERT INTO users (email, password_hash, role_id, name) VALUES ($1, $2, 2, $3) RETURNING user_id",
          [tpc.email, hashedPassword, tpc.name]
        );
        const userId = newUser.rows[0].user_id;

        // Insert faculty profile
        await pool.query(
          "INSERT INTO faculty_profiles (user_id, dept_id, employee_code, designation) VALUES ($1, $2, $3, $4)",
          [userId, dept.dept_id, tpc.college_id || null, "TPC Coordinator"]
        );

        // Send email
        const emailResult = await sendTPCWelcomeEmail(tpc.email, tpc.name, rawPassword);

        results.push({
          ...tpc,
          status: "created",
          emailSent: emailResult.success,
          rawPassword,
        });
      } catch (innerErr) {
        results.push({ ...tpc, status: "error", reason: innerErr.message });
      }
    }

    res.json({ message: "Bulk operation complete", results });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// Delete a TPC
router.delete("/:id", [authorization, isTPO], async (req, res) => {
  try {
    const { id } = req.params;

    // Verify the user is actually a TPC (role_id = 2)
    const userCheck = await pool.query(
      "SELECT user_id, name, email FROM users WHERE user_id = $1 AND role_id = 2",
      [id]
    );
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: "TPC not found" });
    }

    // Delete user (faculty_profiles will cascade)
    await pool.query("DELETE FROM users WHERE user_id = $1", [id]);

    res.json({
      message: "TPC removed successfully",
      removed: userCheck.rows[0],
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

module.exports = router;

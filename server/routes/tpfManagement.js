const router = require("express").Router();
const pool = require("../config/db");
const bcrypt = require("bcryptjs");
const authorization = require("../middleware/authorization");
const { sendTPFWelcomeEmail } = require("../utils/mailer");
const xlsx = require("xlsx");
const path = require("path");
const fs = require("fs");
const multer = require("multer");

// Configure Multer for TPF Excel Uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const { academicYear = '2025-26' } = req.query;
    const dir = path.join(__dirname, `../data/TPFs/${academicYear}/`);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, "TPF_List.xlsx");
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

// Get all TPFs
router.get("/", [authorization, isTPO], async (req, res) => {
  try {
    const { academicYear = '2025-26' } = req.query;
    const tpfs = await pool.query(
      `SELECT u.user_id, u.name, u.email, fp.employee_code as college_id, d.name as department_name, d.dept_id
       FROM users u
       JOIN faculty_profiles fp ON u.user_id = fp.user_id
       JOIN departments d ON fp.dept_id = d.dept_id
       WHERE u.role_id = 3` // 3 = tpf
    );
    res.json(tpfs.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// Upload TPF Excel File
router.post("/upload", [authorization, isTPO, upload.single("file")], async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    res.json({ message: "TPF List uploaded successfully", filename: req.file.filename });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// Sync TPFs from stored Excel file
router.post("/sync", [authorization, isTPO], async (req, res) => {
  try {
    const { academicYear = '2025-26' } = req.body;
    const excelPath = path.join(__dirname, `../data/TPFs/${academicYear}/`, "TPF_List.xlsx");
    
    if (!fs.existsSync(excelPath)) {
      return res.status(404).json({ 
        error: `TPF list for ${academicYear} not found.`,
        details: `Please ensure the file is uploaded first.`
      });
    }

    const workbook = xlsx.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const tpfsData = xlsx.utils.sheet_to_json(worksheet);

    if (tpfsData.length === 0) {
      return res.json({ message: "Excel is empty", results: [] });
    }

    // Fetch departments
    const deptResult = await pool.query("SELECT dept_id, name, code FROM departments");
    const depts = deptResult.rows;

    const results = [];

    for (const row of tpfsData) {
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
          // Create new TPF
          const rawPassword = `TPF@${Math.floor(1000 + Math.random() * 9000)}`;
          const salt = await bcrypt.genSalt(10);
          const hashedPassword = await bcrypt.hash(rawPassword, salt);

          await pool.query("BEGIN");
          const newUser = await pool.query(
            "INSERT INTO users (email, password_hash, role_id, name) VALUES ($1, $2, 3, $3) RETURNING user_id",
            [email, hashedPassword, name]
          );
          const userId = newUser.rows[0].user_id;
          await pool.query(
            "INSERT INTO faculty_profiles (user_id, dept_id, employee_code, designation) VALUES ($1, $2, $3, $4)",
            [userId, dept.dept_id, college_id || null, "TPF Coordinator"]
          );
          await pool.query("COMMIT");

          const emailResult = await sendTPFWelcomeEmail(email, name, rawPassword);
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

// Create new TPF
router.post("/", [authorization, isTPO], async (req, res) => {
  try {
    const { name, email, department_id, college_id } = req.body;

    // Check if user already exists
    const userCheck = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (userCheck.rows.length > 0) {
      return res.status(400).json({ error: "User with this email already exists" });
    }

    // Generate random password (e.g., TPF@1234)
    const rawPassword = `TPF@${Math.floor(1000 + Math.random() * 9000)}`;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(rawPassword, salt);

    // Insert user
    const newUser = await pool.query(
      "INSERT INTO users (email, password_hash, role_id, name) VALUES ($1, $2, 3, $3) RETURNING user_id",
      [email, hashedPassword, name]
    );

    const userId = newUser.rows[0].user_id;

    // Insert faculty profile
    await pool.query(
      "INSERT INTO faculty_profiles (user_id, dept_id, employee_code, designation) VALUES ($1, $2, $3, $4)",
      [userId, department_id, college_id, "TPF Coordinator"]
    );

    // Send welcome email with credentials
    const emailResult = await sendTPFWelcomeEmail(email, name, rawPassword);

    res.json({
      message: "TPF created successfully",
      tpf: { name, email, rawPassword },
      emailSent: emailResult.success,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// Bulk create TPFs (from Excel upload)
router.post("/bulk", [authorization, isTPO], async (req, res) => {
  try {
    const { tpfs } = req.body; // Array of { name, email, department, college_id }
    if (!Array.isArray(tpfs) || tpfs.length === 0) {
      return res.status(400).json({ error: "No TPF data provided" });
    }

    // Fetch departments for name-to-id mapping
    const deptResult = await pool.query("SELECT dept_id, name, code FROM departments");
    const depts = deptResult.rows;

    const results = [];

    for (const tpf of tpfs) {
      try {
        // Check if user already exists
        const userCheck = await pool.query("SELECT * FROM users WHERE email = $1", [tpf.email]);
        if (userCheck.rows.length > 0) {
          results.push({ ...tpf, status: "skipped", reason: "Email already exists" });
          continue;
        }

        // Match department by name or code (case-insensitive)
        const dept = depts.find(d =>
          d.name.toLowerCase() === (tpf.department || "").toLowerCase() ||
          d.code.toLowerCase() === (tpf.department || "").toLowerCase()
        );
        if (!dept) {
          results.push({ ...tpf, status: "skipped", reason: `Department "${tpf.department}" not found` });
          continue;
        }

        // Generate password
        const rawPassword = `TPF@${Math.floor(1000 + Math.random() * 9000)}`;
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(rawPassword, salt);

        // Insert user
        const newUser = await pool.query(
          "INSERT INTO users (email, password_hash, role_id, name) VALUES ($1, $2, 3, $3) RETURNING user_id",
          [tpf.email, hashedPassword, tpf.name]
        );
        const userId = newUser.rows[0].user_id;

        // Insert faculty profile
        await pool.query(
          "INSERT INTO faculty_profiles (user_id, dept_id, employee_code, designation) VALUES ($1, $2, $3, $4)",
          [userId, dept.dept_id, tpf.college_id || null, "TPF Coordinator"]
        );

        // Send email
        const emailResult = await sendTPFWelcomeEmail(tpf.email, tpf.name, rawPassword);

        results.push({
          ...tpf,
          status: "created",
          emailSent: emailResult.success,
          rawPassword,
        });
      } catch (innerErr) {
        results.push({ ...tpf, status: "error", reason: innerErr.message });
      }
    }

    res.json({ message: "Bulk operation complete", results });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// Delete a TPF
router.delete("/:id", [authorization, isTPO], async (req, res) => {
  try {
    const { id } = req.params;

    // Verify the user is actually a TPF (role_id = 3)
    const userCheck = await pool.query(
      "SELECT user_id, name, email FROM users WHERE user_id = $1 AND role_id = 3",
      [id]
    );
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: "TPF not found" });
    }

    // Delete user (faculty_profiles will cascade)
    await pool.query("DELETE FROM users WHERE user_id = $1", [id]);

    res.json({
      message: "TPF removed successfully",
      removed: userCheck.rows[0],
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

module.exports = router;

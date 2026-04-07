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
    const dir = path.join(__dirname, `../data/TPFs/`);
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

// Get all TPFs (Global across all academic years)
router.get("/", [authorization, isTPO], async (req, res) => {
  try {
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
    const excelPath = path.join(__dirname, `../data/TPFs/`, "TPF_List.xlsx");
    
    if (!fs.existsSync(excelPath)) {
      return res.status(404).json({ 
        error: `TPF list not found.`,
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

          // Check if profile exists (Global)
          const profileCheck = await pool.query("SELECT * FROM faculty_profiles WHERE user_id = $1", [userId]);

          await pool.query("BEGIN");
          await pool.query("UPDATE users SET name = $1, role_id = 3 WHERE user_id = $2", [name, userId]);

          if (profileCheck.rows.length > 0) {
            // Update existing global profile
            await pool.query(
              "UPDATE faculty_profiles SET dept_id = $1, employee_code = $2 WHERE user_id = $3",
              [dept.dept_id, college_id || null, userId]
            );
            results.push({ name, email, status: "updated", isGlobal: true });
          } else {
            // Create new global profile
            await pool.query(
              "INSERT INTO faculty_profiles (user_id, dept_id, employee_code, designation, academic_year) VALUES ($1, $2, $3, $4, $5)",
              [userId, dept.dept_id, college_id || null, "TPF Coordinator", "Global"]
            );
            results.push({ name, email, status: "profile_added", isGlobal: true });
          }
          await pool.query("COMMIT");
        } else {
          // Create new TPF user and global profile
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
            "INSERT INTO faculty_profiles (user_id, dept_id, employee_code, designation, academic_year) VALUES ($1, $2, $3, $4, $5)",
            [userId, dept.dept_id, college_id || null, "TPF Coordinator", "Global"]
          );
          await pool.query("COMMIT");

          const emailResult = await sendTPFWelcomeEmail(email, name, rawPassword);
          results.push({ name, email, status: "created", emailSent: emailResult.success, rawPassword, isGlobal: true });
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

// Create new TPF (Global)
router.post("/", [authorization, isTPO], async (req, res) => {
  try {
    const { name, email, department_id, college_id } = req.body;

    // Check if user already exists
    const userCheck = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    let userId;

    if (userCheck.rows.length > 0) {
      userId = userCheck.rows[0].user_id;
      // Check if profile exists (Global)
      const profileCheck = await pool.query("SELECT * FROM faculty_profiles WHERE user_id = $1", [userId]);
      if (profileCheck.rows.length > 0) {
        return res.status(400).json({ error: `TPF Profile already exists for this email` });
      }
      
      await pool.query("UPDATE users SET name = $1, role_id = 3 WHERE user_id = $2", [name, userId]);
    } else {
      // Generate random password
      const rawPassword = `TPF@${Math.floor(1000 + Math.random() * 9000)}`;
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(rawPassword, salt);

      // Insert user
      const newUser = await pool.query(
        "INSERT INTO users (email, password_hash, role_id, name) VALUES ($1, $2, 3, $3) RETURNING user_id",
        [email, hashedPassword, name]
      );
      userId = newUser.rows[0].user_id;

      // Send welcome email (only for new users)
      const emailResult = await sendTPFWelcomeEmail(email, name, rawPassword);
      
      // Insert faculty profile (Global)
      await pool.query(
        "INSERT INTO faculty_profiles (user_id, dept_id, employee_code, designation, academic_year) VALUES ($1, $2, $3, $4, $5)",
        [userId, department_id, college_id, "TPF Coordinator", "Global"]
      );

      return res.json({
        message: "TPF created successfully",
        tpf: { name, email, rawPassword },
        emailSent: emailResult.success,
      });
    }

    // Insert faculty profile (Global) for existing user
    await pool.query(
      "INSERT INTO faculty_profiles (user_id, dept_id, employee_code, designation, academic_year) VALUES ($1, $2, $3, $4, $5)",
      [userId, department_id, college_id, "TPF Coordinator", "Global"]
    );

    res.json({
      message: "TPF profile created successfully",
      isGlobal: true
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// Bulk create TPFs (Global)
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
        // Match department by name or code (case-insensitive)
        const dept = depts.find(d =>
          d.name.toLowerCase() === (tpf.department || "").toLowerCase() ||
          d.code.toLowerCase() === (tpf.department || "").toLowerCase()
        );
        if (!dept) {
          results.push({ ...tpf, status: "skipped", reason: `Department "${tpf.department}" not found` });
          continue;
        }

        // Check if user already exists
        const userCheck = await pool.query("SELECT user_id FROM users WHERE email = $1", [tpf.email]);
        let userId;

        if (userCheck.rows.length > 0) {
           userId = userCheck.rows[0].user_id;
           // Check if profile exists (Global)
           const profileCheck = await pool.query("SELECT * FROM faculty_profiles WHERE user_id = $1", [userId]);
           if (profileCheck.rows.length > 0) {
             results.push({ ...tpf, status: "skipped", reason: `Profile already exists` });
             continue;
           }
           await pool.query("UPDATE users SET name = $1, role_id = 3 WHERE user_id = $2", [tpf.name, userId]);
        } else {
          // Generate password
          const rawPassword = `TPF@${Math.floor(1000 + Math.random() * 9000)}`;
          const salt = await bcrypt.genSalt(10);
          const hashedPassword = await bcrypt.hash(rawPassword, salt);

          // Insert user
          const newUser = await pool.query(
            "INSERT INTO users (email, password_hash, role_id, name) VALUES ($1, $2, 3, $3) RETURNING user_id",
            [tpf.email, hashedPassword, tpf.name]
          );
          userId = newUser.rows[0].user_id;
          
          await sendTPFWelcomeEmail(tpf.email, tpf.name, rawPassword);
          results.push({ ...tpf, status: "created", rawPassword });
        }

        // Insert faculty profile (Global)
        await pool.query(
          "INSERT INTO faculty_profiles (user_id, dept_id, employee_code, designation, academic_year) VALUES ($1, $2, $3, $4, $5)",
          [userId, dept.dept_id, tpf.college_id || null, "TPF Coordinator", "Global"]
        );
        
        if (!results.find(r => r.email === tpf.email)) {
            results.push({ ...tpf, status: "profile_added" });
        }
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

const router = require("express").Router();
const pool = require("../config/db");
const bcrypt = require("bcryptjs");
const authorization = require("../middleware/authorization");
const { sendStudentWelcomeEmail } = require("../utils/mailer");
const xlsx = require("xlsx");
const path = require("path");
const fs = require("fs");

const multer = require("multer");

// Middleware to check if requester is a TPC
const isTPC = async (req, res, next) => {
  try {
    const userResult = await pool.query("SELECT role_id FROM users WHERE user_id = $1", [req.user.id]);
    if (userResult.rows.length === 0 || userResult.rows[0].role_id !== 2) { // 2 = tpc
      return res.status(403).json({ error: "Access denied: TPC role required" });
    }
    next();
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

// Configure Multer for Excel Uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const { academicYear = '2025-26' } = req.query;
    const dir = path.join(__dirname, `../data/students/${academicYear}/`);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: async function (req, file, cb) {
    try {
      // Get department name to name the file correctly
      const tpcResult = await pool.query(
        "SELECT d.name FROM faculty_profiles fp JOIN departments d ON fp.dept_id = d.dept_id WHERE fp.user_id = $1",
        [req.user.id]
      );
      const deptName = tpcResult.rows[0]?.name || "Unknown";
      cb(null, `${deptName}_Students.xlsx`);
    } catch (err) {
      cb(err);
    }
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

// Upload Excel File
router.post("/upload", [authorization, isTPC, upload.single("file")], async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    res.json({ message: "File uploaded successfully", filename: req.file.filename });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// Sync students from Excel file
router.post("/sync", [authorization, isTPC], async (req, res) => {
  try {
    // 1. Get TPC's department
    const tpcResult = await pool.query(
      `SELECT d.name as department_name, d.dept_id 
       FROM faculty_profiles fp 
       JOIN departments d ON fp.dept_id = d.dept_id 
       WHERE fp.user_id = $1`, 
      [req.user.id]
    );

    if (tpcResult.rows.length === 0) {
      return res.status(404).json({ 
        error: "TPC Authorization Error", 
        details: "We couldn't find a Faculty Profile or Department linked to your TPC account. Please contact the TPO to ensure your profile is fully set up in the system."
      });
    }

    const { department_name, dept_id } = tpcResult.rows[0];
    const { academicYear = '2024-25' } = req.body;

    // 2. Read Department-specific Excel file
    const excelFilename = `${department_name}_Students.xlsx`;
    const excelPath = path.join(__dirname, `../data/students/${academicYear}/`, excelFilename);
    
    if (!fs.existsSync(excelPath)) {
      return res.status(404).json({ 
        error: `Excel file for ${department_name} branch not found for ${academicYear}.`,
        details: `Please ensure the file is uploaded or placed at: server/data/students/${academicYear}/${excelFilename}`
      });
    }

    const workbook = xlsx.readFile(excelPath);
    
    // Take the first sheet of the departmental file
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return res.status(404).json({ error: `The Excel file "${excelFilename}" for ${academicYear} is empty (no sheets found)` });
    }

    const worksheet = workbook.Sheets[sheetName];
    const studentsData = xlsx.utils.sheet_to_json(worksheet);

    if (studentsData.length === 0) {
      return res.json({ message: "Sheet is empty", results: [] });
    }

    const results = [];

    // 3. Process each student
    for (const row of studentsData) {
      // Expected columns: name, department, college_id, mobile_number, mail_id
      const name = row.name || row.Name || row.full_name;
      const email = row.mail_id || row.Email || row.email || row.mail;
      const college_id = row.college_id || row.enrollment_no || row.CollegeID || row.Id;
      const mobile = row.mobile_number || row.Phone || row.mobile;

      if (!email || !name) {
        results.push({ name: name || "Unknown", email: email || "N/A", status: "skipped", reason: "Missing name or email" });
        continue;
      }

      try {
        // Check if user already exists (by email) -> For multi-year we need to check if they exist in THAT year? 
        // Actually, a student might be registered for multiple years if they repeating, but typically they are unique across the whole system.
        // However, their profile for THAT year should be what we want.
        // Let's check if the USER exists, then check if they HAVE a profile for THAT year.
        const userCheck = await pool.query("SELECT user_id FROM users WHERE email = $1", [email]);
        
        if (userCheck.rows.length > 0) {
          const userId = userCheck.rows[0].user_id;

          // Check if profile for THIS year already exists? If not, create it.
          const profileCheck = await pool.query("SELECT * FROM student_profiles WHERE user_id = $1 AND academic_year = $2", [userId, academicYear]);
          
          if (profileCheck.rows.length > 0) {
              // UPDATE existing student profile for this year
              await pool.query("BEGIN");
              await pool.query("UPDATE users SET name = $1 WHERE user_id = $2", [name, userId]);
              await pool.query(
                "UPDATE student_profiles SET enrollment_no = $1, phone_number = $2 WHERE user_id = $3 AND academic_year = $4",
                [college_id || null, mobile ? String(mobile) : null, userId, academicYear]
              );
              await pool.query("COMMIT");
              results.push({ name, email, status: "updated", reason: `Profile details updated for ${academicYear}` });
          } else {
              // CREATE new profile for existing user for this year
              await pool.query("BEGIN");
              await pool.query("UPDATE users SET name = $1 WHERE user_id = $2", [name, userId]);
              await pool.query(
                "INSERT INTO student_profiles (user_id, dept_id, enrollment_no, phone_number, academic_year) VALUES ($1, $2, $3, $4, $5)",
                [userId, dept_id, college_id || null, mobile ? String(mobile) : null, academicYear]
              );
              await pool.query("COMMIT");
              results.push({ name, email, status: "created", reason: `New profile created for ${academicYear}` });
          }
          continue;
        }

        // CREATE new student user and profile
        const rawPassword = `STU@${Math.floor(1000 + Math.random() * 9000)}`;
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(rawPassword, salt);

        await pool.query("BEGIN");

        const newUser = await pool.query(
          "INSERT INTO users (email, password_hash, role_id, name) VALUES ($1, $2, 1, $3) RETURNING user_id",
          [email, hashedPassword, name]
        );
        const userId = newUser.rows[0].user_id;

        await pool.query(
          "INSERT INTO student_profiles (user_id, dept_id, enrollment_no, phone_number, academic_year) VALUES ($1, $2, $3, $4, $5)",
          [userId, dept_id, college_id || null, mobile ? String(mobile) : null, academicYear]
        );

        await pool.query("COMMIT");

        // Send welcome email
        const emailResult = await sendStudentWelcomeEmail(email, name, rawPassword);
        results.push({
          name,
          email,
          college_id,
          status: "created",
          emailSent: emailResult.success,
          rawPassword
        });

      } catch (innerErr) {
        await pool.query("ROLLBACK");
        console.error(`Error processing student ${email}:`, innerErr.message);
        results.push({ name, email, status: "error", reason: innerErr.message });
      }
    }

    res.json({ 
      message: "Sync operation complete", 
      department: department_name,
      totalProcessed: studentsData.length,
      results 
    });

  } catch (err) {
    console.error("[Sync Students Error]:", err.message);
    res.status(500).send("Server Error");
  }
});

// Get department students (for TPC view)
router.get("/", [authorization, isTPC], async (req, res) => {
  try {
    const { academicYear = '2024-25' } = req.query;
    const tpcResult = await pool.query(
      "SELECT dept_id FROM faculty_profiles WHERE user_id = $1", 
      [req.user.id]
    );

    if (tpcResult.rows.length === 0) return res.status(404).json({ error: "TPC not found" });
    const { dept_id } = tpcResult.rows[0];

    const students = await pool.query(
      `SELECT u.user_id, u.name, u.email, sp.enrollment_no, sp.phone_number, sp.is_verified, sp.tpc_verified
       FROM users u
       JOIN student_profiles sp ON u.user_id = sp.user_id
       WHERE sp.dept_id = $1 AND u.role_id = 1 AND sp.academic_year = $2
       ORDER BY u.name ASC`,
      [dept_id, academicYear]
    );

    res.json(students.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

module.exports = router;

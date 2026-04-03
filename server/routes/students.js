const router = require("express").Router();
const pool = require("../config/db");
const authorization = require("../middleware/authorization");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// ─── Multer setup for resume uploads ───────────────────────────────────────
const resumeDir = path.join(__dirname, "../uploads/resumes");
if (!fs.existsSync(resumeDir)) fs.mkdirSync(resumeDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, resumeDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `resume_user_${req.user.id}_${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf") cb(null, true);
    else cb(new Error("Only PDF files are allowed"));
  },
});


// ─── GET /students/all — All students with verification status ───────────────
router.get("/all", authorization, async (req, res) => {
  try {
    const { dept_id, academicYear = '2024-25' } = req.query;
    let finalDeptId = dept_id;

    // Identify requester role
    const userRes = await pool.query("SELECT role_id FROM users WHERE user_id = $1", [req.user.id]);
    const roleId = userRes.rows[0].role_id;

    // If requester is TPC (2) or TPF (3), force dept_id to their own department
    if (roleId === 2 || roleId === 3) {
      const facRes = await pool.query("SELECT dept_id FROM faculty_profiles WHERE user_id = $1", [req.user.id]);
      if (facRes.rows.length > 0) {
        finalDeptId = facRes.rows[0].dept_id;
      }
    }

    let query = `
      SELECT
        sp.*,
        u.name as user_name,
        u.email,
        d.name as department_name,
        c.name as placed_company_name
      FROM student_profiles sp
      JOIN users u ON sp.user_id = u.user_id
      LEFT JOIN departments d ON sp.dept_id = d.dept_id
      LEFT JOIN applications a ON a.student_id = sp.student_id AND a.status = 'PLACED'
      LEFT JOIN job_postings j ON a.job_id = j.job_id
      LEFT JOIN companies c ON j.company_id = c.company_id
      WHERE sp.academic_year = $1
    `;
    const params = [academicYear];
    let paramIndex = 2;

    if (finalDeptId) {
      query += ` AND sp.dept_id = $${paramIndex++}`;
      params.push(finalDeptId);
    }

    query += ' ORDER BY u.name ASC';

    const result = await pool.query(query, params);

    const students = result.rows.map(s => ({
      id: String(s.student_id),
      student_id: s.student_id,
      user_id: s.user_id,
      name: s.user_name || s.email.split('@')[0],
      email: s.email,
      department: s.department_name || '—',
      dept_id: s.dept_id,
      enrollment_no: s.enrollment_no,
      cgpa: s.cgpa ?? 0,
      backlogs: s.active_backlogs ?? 0,
      active_backlogs: s.active_backlogs ?? 0,
      total_backlogs: s.total_backlogs ?? 0,
      resume_url: s.resume_url || null,
      profile_picture_url: s.profile_picture_url || null,
      class_10_percentage: s.class_10_percentage ?? null,
      class_12_percentage: s.class_12_percentage ?? null,
      diploma_percentage: s.diploma_percentage ?? null,
      // Personal details
      phone_number: s.phone_number || null,
      gender: s.gender || null,
      address: s.address || null,
      personal_email: s.personal_email || null,
      date_of_birth: s.date_of_birth || null,
      passing_year: s.passing_year || null,
      linkedin_url: s.linkedin_url || null,
      gap_years: s.gap_years ?? 0,
      // Verification & placement
      isTpcVerified: s.tpc_verified || false,
      isTpoVerified: s.tpo_verified || false,
      isPlaced: s.is_placed || false,
      placedCompany: s.placed_company_name || null,
      placedCompanyName: s.placed_company_name || null,
      verificationStage: s.tpo_verified ? 'tpo_verified'
        : s.tpc_verified ? 'tpc_verified'
        : 'pending',
    }));

    res.json(students);
  } catch (err) {
    console.error('[GET /students/all Error]:', err.message);
    res.status(500).send('Server Error');
  }
});

// ─── PUT /students/:id/verify — Verify a student at a given stage ────────────
router.put("/:id/verify", authorization, async (req, res) => {
  try {
    const { id } = req.params;
    const { stage } = req.body; // 'tpc' | 'tpo'

    const colMap = { tpc: 'tpc_verified', tpo: 'tpo_verified' };
    const col = colMap[stage];
    if (!col) return res.status(400).json({ error: 'Invalid stage. Use tpc or tpo.' });

    // Step 1: Set the verification flag for this stage
    const result = await pool.query(
      `UPDATE student_profiles
       SET ${col} = TRUE
       WHERE student_id = $1
       RETURNING *`,
      [id]
    );

    if (result.rowCount === 0) return res.status(404).json({ error: 'Student not found' });

    const student = result.rows[0];

    // Step 2: Compute is_verified = TRUE when both tpc and tpo are verified
    const isFullyVerified = student.tpc_verified && student.tpo_verified;
    if (isFullyVerified !== student.is_verified) {
      await pool.query(
        `UPDATE student_profiles SET is_verified = $1 WHERE student_id = $2`,
        [isFullyVerified, id]
      );
    }

    res.json({ message: `Student ${stage.toUpperCase()} verified`, student: { ...student, is_verified: isFullyVerified } });
  } catch (err) {
    console.error('[PUT /students/:id/verify Error]:', err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

// ─── PUT /students/:id/reject — Reject a student verification ────────────────
router.put("/:id/reject", authorization, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, stage } = req.body;

    // Reject sets all higher-level verifications to false and alerts the student
    const result = await pool.query(
      `UPDATE student_profiles
       SET tpc_verified = FALSE, tpo_verified = FALSE, tpf_verified = FALSE, is_verified = FALSE
       WHERE student_id = $1
       RETURNING *`,
      [id]
    );

    if (result.rowCount === 0) return res.status(404).json({ error: 'Student not found' });
    
    const student = result.rows[0];

    // Create a notification for the student
    const message = `Your profile verification was rejected by ${stage.toUpperCase()}. Reason: ${reason || 'Please review and update your details.'}`;
    await pool.query(
      "INSERT INTO notifications (user_id, message, type) VALUES ($1, $2, $3)",
      [student.user_id, message, 'verification_rejected']
    );

    res.json({ message: 'Student verification rejected', student });
  } catch (err) {
    console.error('[PUT /students/:id/reject Error]:', err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

// Create student profile
router.post("/", authorization, async (req, res) => {
  try {
    const { dept_id, enrollment_no, cgpa, active_backlogs } = req.body;
    const newStudent = await pool.query(
      "INSERT INTO student_profiles (user_id, dept_id, enrollment_no, cgpa, active_backlogs) VALUES($1, $2, $3, $4, $5) RETURNING *",
      [req.user.id, dept_id, enrollment_no, cgpa, active_backlogs || 0]
    );

    res.json(newStudent.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// Get student profile with full details (user info + department)
router.get("/me", authorization, async (req, res) => {
  try {
    const student = await pool.query(
      `SELECT 
        sp.*,
        u.email,
        u.name as user_name,
        u.role_id,
        d.name as department_name
       FROM student_profiles sp
       JOIN users u ON sp.user_id = u.user_id
       LEFT JOIN departments d ON sp.dept_id = d.dept_id
       WHERE sp.user_id = $1`,
      [req.user.id]
    );

    if (student.rows.length === 0) {
      return res.status(404).json({ error: "Student profile not found" });
    }

    const profile = student.rows[0];
    // Use stored name, fall back to email prefix
    const displayName = profile.user_name ||
      (profile.email.split('@')[0].charAt(0).toUpperCase() + profile.email.split('@')[0].slice(1));

    res.json({
      ...profile,
      name: displayName,
      placed_company: null,
      placed_company_name: null,
      resume_url: profile.resume_url || null
    });
  } catch (err) {
    console.error('[/students/me Error]:', err.message);
    res.status(500).send("Server Error");
  }
});

// Update student profile
router.put("/me", authorization, async (req, res) => {
  try {
    const {
      name,
      dept_id, enrollment_no,
      cgpa, active_backlogs, total_backlogs,
      class_10_percentage, class_12_percentage, diploma_percentage,
      gap_years, phone_number, gender, address, personal_email,
      date_of_birth, passing_year, linkedin_url
    } = req.body;

    // Validate ranges
    if (cgpa !== undefined && (cgpa < 0 || cgpa > 10))
      return res.status(400).json({ error: "CGPA must be between 0 and 10" });
    if (active_backlogs !== undefined && active_backlogs < 0)
      return res.status(400).json({ error: "Active backlogs cannot be negative" });
    if (total_backlogs !== undefined && total_backlogs < 0)
      return res.status(400).json({ error: "Total backlogs cannot be negative" });
    if (class_10_percentage !== undefined && (class_10_percentage < 0 || class_10_percentage > 100))
      return res.status(400).json({ error: "10th percentage must be between 0 and 100" });
    if (class_12_percentage !== undefined && (class_12_percentage < 0 || class_12_percentage > 100))
      return res.status(400).json({ error: "12th percentage must be between 0 and 100" });
    if (diploma_percentage !== undefined && diploma_percentage !== null && (diploma_percentage < 0 || diploma_percentage > 100))
      return res.status(400).json({ error: "Diploma percentage must be between 0 and 100" });
    if (gap_years !== undefined && gap_years < 0)
      return res.status(400).json({ error: "Gap years cannot be negative" });

    // Update name in users table if provided
    if (name !== undefined && name.trim() !== '') {
      await pool.query('UPDATE users SET name = $1 WHERE user_id = $2', [name.trim(), req.user.id]);
    }

    // Build update query for student_profiles dynamically
    const updates = [];
    const values = [];
    let paramCount = 1;

    const addField = (col, val) => {
      if (val !== undefined) {
        updates.push(`${col} = $${paramCount++}`);
        values.push(val);
      }
    };

    addField('dept_id',               dept_id);
    addField('enrollment_no',         enrollment_no);
    addField('cgpa',                  cgpa);
    addField('active_backlogs',       active_backlogs);
    addField('total_backlogs',        total_backlogs);
    addField('class_10_percentage',   class_10_percentage);
    addField('class_12_percentage',   class_12_percentage);
    addField('diploma_percentage',    diploma_percentage);
    addField('gap_years',             gap_years);
    addField('phone_number',          phone_number);
    addField('gender',                gender);
    addField('address',               address);
    addField('personal_email',        personal_email);
    addField('date_of_birth',         date_of_birth);
    addField('passing_year',          passing_year);
    addField('linkedin_url',          linkedin_url);

    if (updates.length === 0 && (name === undefined || name.trim() === ''))
      return res.status(400).json({ error: "No fields to update" });

    if (updates.length > 0) {
      values.push(req.user.id);
      const result = await pool.query(
        `UPDATE student_profiles SET ${updates.join(', ')} WHERE user_id = $${paramCount} RETURNING *`,
        values
      );
      if (result.rows.length === 0)
        return res.status(404).json({ error: "Student profile not found" });
    }

    res.json({ message: 'Profile updated successfully' });
  } catch (err) {
    console.error('[/students/me PUT Error]:', err.message);
    res.status(500).json({ error: "Server Error", details: err.message });
  }
});



// GET /students/dashboard-summary - all data needed for the student dashboard in one call
router.get('/dashboard-summary', authorization, async (req, res) => {
  try {
    // 1. Student profile with department
    const profileResult = await pool.query(
      `SELECT sp.*, u.email, u.name as user_name, d.name as department_name
       FROM student_profiles sp
       JOIN users u ON sp.user_id = u.user_id
       LEFT JOIN departments d ON sp.dept_id = d.dept_id
       WHERE sp.user_id = $1`,
      [req.user.id]
    );

    if (profileResult.rows.length === 0) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    const profile = profileResult.rows[0];

    // Use stored name, fall back to email prefix
    const displayName = profile.user_name ||
      profile.email.split('@')[0]
        .replace(/[._-]/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());

    // 2. All applications for this student
    const appsResult = await pool.query(
      `SELECT a.app_id, a.job_id, a.status, a.applied_at,
              j.title as job_title, j.deadline,
              c.name as company_name
       FROM applications a
       JOIN job_postings j ON a.job_id = j.job_id
       JOIN companies c ON j.company_id = c.company_id
       WHERE a.student_id = $1
       ORDER BY a.applied_at DESC`,
      [profile.student_id]
    );

    // 3. All open jobs with application counts
    const jobsResult = await pool.query(
      `SELECT j.job_id, j.title, j.min_cgpa, j.deadline, j.status,
              c.name as company_name,
              COUNT(a.app_id) as applications_count
       FROM job_postings j
       JOIN companies c ON j.company_id = c.company_id
       LEFT JOIN applications a ON j.job_id = a.job_id
       WHERE j.status = 'OPEN'
       GROUP BY j.job_id, c.company_id, c.name
       ORDER BY j.deadline ASC`
    );

    res.json({
      profile: { ...profile, name: displayName },
      applications: appsResult.rows,
      jobs: jobsResult.rows,
    });
  } catch (err) {
    console.error('[/students/dashboard-summary Error]:', err.message);
    res.status(500).send('Server Error');
  }
});

// ─── Profile Picture multer setup ───────────────────────────────────────────
const picDir = path.join(__dirname, "../uploads/profile-pictures");
if (!fs.existsSync(picDir)) fs.mkdirSync(picDir, { recursive: true });

const picStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, picDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `avatar_user_${req.user.id}_${Date.now()}${ext}`);
  },
});

const picUpload = multer({
  storage: picStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
  fileFilter: (_req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) cb(null, true);
    else cb(new Error("Only JPEG, PNG or WebP images are allowed"));
  },
});

// ─── POST /students/me/profile-picture — Upload avatar ──────────────────────
router.post("/me/profile-picture", authorization, (req, res) => {
  picUpload.single("profile_picture")(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    try {
      // Delete old picture from disk
      const existing = await pool.query(
        "SELECT profile_picture_url FROM student_profiles WHERE user_id = $1",
        [req.user.id]
      );
      if (existing.rows[0]?.profile_picture_url) {
        const oldPath = path.join(__dirname, "../", existing.rows[0].profile_picture_url.replace(/^\//, ""));
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }

      const picUrl = `/uploads/profile-pictures/${req.file.filename}`;
      await pool.query(
        "UPDATE student_profiles SET profile_picture_url = $1 WHERE user_id = $2",
        [picUrl, req.user.id]
      );

      res.json({ profile_picture_url: picUrl });
    } catch (dbErr) {
      console.error("[Profile Picture Upload Error]:", dbErr.message);
      res.status(500).json({ error: "Database error", details: dbErr.message });
    }
  });
});

// ─── DELETE /students/me/profile-picture — Remove avatar ────────────────────
router.delete("/me/profile-picture", authorization, async (req, res) => {
  try {
    const existing = await pool.query(
      "SELECT profile_picture_url FROM student_profiles WHERE user_id = $1",
      [req.user.id]
    );
    const picUrl = existing.rows[0]?.profile_picture_url;
    if (picUrl) {
      const filePath = path.join(__dirname, "../", picUrl.replace(/^\//, ""));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    await pool.query(
      "UPDATE student_profiles SET profile_picture_url = NULL WHERE user_id = $1",
      [req.user.id]
    );
    res.json({ message: "Profile picture removed" });
  } catch (err) {
    console.error("[Profile Picture Delete Error]:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── POST /students/me/resume — Upload a PDF resume ────────────────────────
router.post("/me/resume", authorization, (req, res) => {
  upload.single("resume")(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    try {
      // Delete old resume file from disk if it exists
      const existing = await pool.query(
        "SELECT resume_url FROM student_profiles WHERE user_id = $1",
        [req.user.id]
      );
      if (existing.rows[0]?.resume_url) {
        const oldPath = path.join(
          __dirname,
          "../",
          existing.rows[0].resume_url.replace(/^\//, "")
        );
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }

      const resumeUrl = `/uploads/resumes/${req.file.filename}`;

      const result = await pool.query(
        "UPDATE student_profiles SET resume_url = $1 WHERE user_id = $2 RETURNING *",
        [resumeUrl, req.user.id]
      );

      res.json({ message: "Resume uploaded successfully", resume_url: resumeUrl, profile: result.rows[0] });
    } catch (dbErr) {
      console.error("[Resume Upload DB Error]:", dbErr.message);
      res.status(500).json({ error: "Database error", details: dbErr.message });
    }
  });
});

// ─── DELETE /students/me/resume — Remove resume ─────────────────────────────
router.delete("/me/resume", authorization, async (req, res) => {
  try {
    const existing = await pool.query(
      "SELECT resume_url FROM student_profiles WHERE user_id = $1",
      [req.user.id]
    );

    const resumeUrl = existing.rows[0]?.resume_url;
    if (resumeUrl) {
      const filePath = path.join(__dirname, "../", resumeUrl.replace(/^\//, ""));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await pool.query(
      "UPDATE student_profiles SET resume_url = NULL WHERE user_id = $1",
      [req.user.id]
    );

    res.json({ message: "Resume deleted successfully" });
  } catch (err) {
    console.error("[Resume Delete Error]:", err.message);
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

module.exports = router;


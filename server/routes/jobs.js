const router = require("express").Router();
const pool = require("../config/db");
const authorization = require("../middleware/authorization");

// Create Job Posting
router.post("/", authorization, async (req, res) => {
  try {
    let { company_id, company_name, title, min_cgpa, min_10th_percent, min_12th_percent, max_backlogs, eligible_branches, deadline, selection_process, is_public, academic_year } = req.body;
    
    // Auto-resolve or create company if company_name is provided directly
    if (company_name && !company_id) {
        const exist = await pool.query("SELECT company_id FROM companies WHERE LOWER(name) = LOWER($1) LIMIT 1", [company_name]);
        if (exist.rows.length > 0) {
            company_id = exist.rows[0].company_id;
        } else {
            const newComp = await pool.query("INSERT INTO companies (name) VALUES($1) RETURNING company_id", [company_name]);
            company_id = newComp.rows[0].company_id;
        }
    }

    // Add columns dynamically safely into Postgres jsonb
    const newJob = await pool.query(
      `INSERT INTO job_postings 
         (company_id, posted_by, title, min_cgpa, min_10th_percent, min_12th_percent, deadline, max_backlogs, eligible_branches, selection_process, is_public, academic_year) 
       VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) 
       RETURNING *`,
      [
        company_id, 
        req.user.id, 
        title, 
        min_cgpa || 0,
        min_10th_percent || 0,
        min_12th_percent || 0,
        deadline, 
        max_backlogs || 0,
        eligible_branches || ['All'],
        selection_process ? JSON.stringify(selection_process) : JSON.stringify(["Applied", "Aptitude", "Coding Round", "Technical Interview", "HR Interview", "Placed"]),
        is_public || false,
        academic_year || '2025-26'
      ]
    );
    res.json(newJob.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send(err.message);
  }
});

// Get all jobs with application counts
router.get("/", async (req, res) => {
  try {
    const { academicYear = '2025-26' } = req.query;
    const allJobs = await pool.query(
      `SELECT 
        j.*, 
        c.name as company_name, 
        c.website, 
        c.is_blacklisted,
        COUNT(a.app_id) as applications_count
       FROM job_postings j 
       JOIN companies c ON j.company_id = c.company_id 
       LEFT JOIN applications a ON j.job_id = a.job_id
       WHERE j.is_public = true AND j.academic_year = $1
       GROUP BY j.job_id, c.company_id, c.name, c.website, c.is_blacklisted
       ORDER BY j.deadline ASC`,
       [academicYear]
    );
    res.json(allJobs.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// Get Single Job with details
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const job = await pool.query(
      `SELECT 
        j.*, 
        c.name as company_name,
        c.website,
        COUNT(a.app_id) as applications_count
       FROM job_postings j
       JOIN companies c ON j.company_id = c.company_id
       LEFT JOIN applications a ON j.job_id = a.job_id
       WHERE j.job_id = $1
       GROUP BY j.job_id, c.company_id, c.name, c.website`,
      [id]
    );

    res.json(job.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// Get candidates for a specific job (Restricted for TPF/TPC)
router.get("/:id/candidates", authorization, async (req, res) => {
  try {
    const { id } = req.params;

    // Identify requester role
    const userRes = await pool.query("SELECT role_id FROM users WHERE user_id = $1", [req.user.id]);
    const roleId = userRes.rows[0].role_id;
    let deptId = null;

    // If requester is TPC (2) or TPF (3), force dept_id to their own department
    if (roleId === 2 || roleId === 3) {
      const facRes = await pool.query("SELECT dept_id FROM faculty_profiles WHERE user_id = $1", [req.user.id]);
      if (facRes.rows.length > 0) {
        deptId = facRes.rows[0].dept_id;
      }
    }

    let query = `
      SELECT 
        a.app_id,
        a.status as application_status,
        a.applied_at,
        s.student_id,
        s.enrollment_no,
        s.cgpa,
        s.active_backlogs,
        s.is_placed,
        u.name,
        u.email,
        u.user_id,
        d.name as department
       FROM applications a
       JOIN student_profiles s ON a.student_id = s.student_id
       JOIN users u ON s.user_id = u.user_id
       LEFT JOIN departments d ON s.dept_id = d.dept_id
       WHERE a.job_id = $1
    `;
    const params = [id];

    if (deptId) {
      query += ` AND s.dept_id = $2`;
      params.push(deptId);
    }

    query += ` ORDER BY a.applied_at DESC`;

    const candidates = await pool.query(query, params);
    res.json(candidates.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// Get ALL jobs (For TPO/Admin management)
router.get("/all/admin", authorization, async (req, res) => {
  try {
    const { academicYear = '2025-26' } = req.query;
    const allJobs = await pool.query(
      `SELECT 
        j.*, 
        c.name as company_name, 
        c.website, 
        c.is_blacklisted,
        COUNT(a.app_id) as applications_count
       FROM job_postings j 
       JOIN companies c ON j.company_id = c.company_id 
       LEFT JOIN applications a ON j.job_id = a.job_id
       WHERE j.academic_year = $1
       GROUP BY j.job_id, c.company_id, c.name, c.website, c.is_blacklisted
       ORDER BY j.created_at DESC`,
       [academicYear]
    );
    res.json(allJobs.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// Update Job Posting
router.put("/:id", authorization, async (req, res) => {
  try {
    const { id } = req.params;
    let { company_name, title, min_cgpa, min_10th_percent, min_12th_percent, max_backlogs, eligible_branches, deadline, selection_process, is_public, status } = req.body;

    // Resolve company_id if name changed
    let company_id;
    if (company_name) {
      const exist = await pool.query("SELECT company_id FROM companies WHERE LOWER(name) = LOWER($1) LIMIT 1", [company_name]);
      if (exist.rows.length > 0) {
        company_id = exist.rows[0].company_id;
      } else {
        const newComp = await pool.query("INSERT INTO companies (name) VALUES($1) RETURNING company_id", [company_name]);
        company_id = newComp.rows[0].company_id;
      }
    }

    const updateJob = await pool.query(
      `UPDATE job_postings 
       SET company_id = COALESCE($1, company_id),
           title = COALESCE($2, title),
           min_cgpa = COALESCE($3, min_cgpa),
           min_10th_percent = COALESCE($4, min_10th_percent),
           min_12th_percent = COALESCE($5, min_12th_percent),
           max_backlogs = COALESCE($6, max_backlogs),
           eligible_branches = COALESCE($7, eligible_branches),
           deadline = COALESCE($8, deadline),
           selection_process = COALESCE($9, selection_process),
           is_public = COALESCE($10, is_public),
           status = COALESCE($11, status)
       WHERE job_id = $12
       RETURNING *`,
      [
        company_id, title, min_cgpa, min_10th_percent, min_12th_percent, 
        max_backlogs, eligible_branches, deadline, 
        selection_process ? JSON.stringify(selection_process) : null,
        is_public, status, id
      ]
    );

    res.json(updateJob.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

module.exports = router;

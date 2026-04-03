const router = require("express").Router();
const pool = require("../config/db");
const authorization = require("../middleware/authorization");

// Create application
router.post("/", authorization, async (req, res) => {
  try {
    const { job_id } = req.body;
    
    // Get student_id from user_id
    const student = await pool.query("SELECT student_id FROM student_profiles WHERE user_id = $1", [req.user.id]);
    
    if (student.rows.length === 0) {
        return res.status(400).json("User is not a student");
    }

    const newApplication = await pool.query(
      "INSERT INTO applications (job_id, student_id) VALUES($1, $2) ON CONFLICT (job_id, student_id) DO NOTHING RETURNING *",
      [job_id, student.rows[0].student_id]
    );

    if (newApplication.rows.length === 0) {
        return res.status(400).json({ error: "You have already applied for this job." });
    }

    res.json(newApplication.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// Get all applications for current user (student)
router.get("/me", authorization, async (req, res) => {
  try {
    const applications = await pool.query(
      `SELECT a.*, j.title as job_title, j.deadline, j.selection_process, c.name as company_name, c.website 
       FROM applications a 
       JOIN student_profiles s ON a.student_id = s.student_id 
       JOIN job_postings j ON a.job_id = j.job_id 
       JOIN companies c ON j.company_id = c.company_id 
       WHERE s.user_id = $1`,
      [req.user.id]
    );
    res.json(applications.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// Update application status (for Faculty/Recruiter)
router.put("/:id", authorization, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    // Get application and student details before update for notification
    const appInfo = await pool.query(
      `SELECT a.student_id, j.title as job_title, c.name as company_name, sp.user_id 
       FROM applications a 
       JOIN job_postings j ON a.job_id = j.job_id 
       JOIN companies c ON j.company_id = c.company_id 
       JOIN student_profiles sp ON a.student_id = sp.student_id
       WHERE a.app_id = $1`,
      [id]
    );

    const updateApplication = await pool.query(
      "UPDATE applications SET status = $1 WHERE app_id = $2 RETURNING *",
      [status, id]
    );

    if (updateApplication.rows.length === 0) {
      return res.status(404).json("Application not found");
    }

    if (status.toLowerCase() === 'placed' && appInfo.rows.length > 0) {
      await pool.query(
        "UPDATE student_profiles SET is_placed = true WHERE student_id = $1",
        [appInfo.rows[0].student_id]
      );
    }

    // Create notification for student
    if (appInfo.rows.length > 0) {
      const student = appInfo.rows[0];
      const message = `Status updated to ${status} for ${student.job_title} at ${student.company_name}`;
      await pool.query(
        "INSERT INTO notifications (user_id, message, type) VALUES ($1, $2, $3)",
        [student.user_id, message, 'application_update']
      );
    }

    res.json(updateApplication.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

module.exports = router;

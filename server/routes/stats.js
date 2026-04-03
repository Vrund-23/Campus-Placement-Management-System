const router = require("express").Router();
const pool = require("../config/db");
const authorization = require("../middleware/authorization");

/**
 * GET /stats/overview
 * Returns real-time placement KPIs and branch-wise breakdown.
 * Requires a valid JWT token.
 */
router.get("/overview", authorization, async (req, res) => {
  try {
    const { academicYear = '2025-26' } = req.query;

    // 1. Total registered students in this year
    const totalStudentsRes = await pool.query(
      `SELECT COUNT(*) AS count FROM student_profiles WHERE academic_year = $1`,
      [academicYear]
    );

    // 2. Placed students in this year
    const placedStudentsRes = await pool.query(
      `SELECT COUNT(*) AS count FROM student_profiles WHERE is_placed = TRUE AND academic_year = $1`,
      [academicYear]
    );

    // 3. Active (OPEN) job postings for this year
    const activeJobsRes = await pool.query(
      `SELECT COUNT(*) AS count FROM job_postings WHERE status = 'OPEN' AND academic_year = $1`,
      [academicYear]
    );

    // 4. Companies that have at least one job posting in this year
    const companiesRes = await pool.query(
      `SELECT COUNT(DISTINCT company_id) AS count FROM job_postings WHERE academic_year = $1`,
      [academicYear]
    );

    // 5. Branch-wise placement breakdown for this year
    const branchRes = await pool.query(`
      SELECT
        d.name                                    AS branch,
        COUNT(sp.student_id)                      AS total,
        COUNT(sp.student_id) FILTER (WHERE sp.is_placed = TRUE) AS placed
      FROM departments d
      LEFT JOIN student_profiles sp ON sp.dept_id = d.dept_id AND sp.academic_year = $1
      GROUP BY d.dept_id, d.name
      ORDER BY d.name ASC
    `, [academicYear]);

    const branchPlacements = branchRes.rows.map(row => {
      const total = parseInt(row.total) || 0;
      const placed = parseInt(row.placed) || 0;
      const percentage = total > 0 ? parseFloat(((placed / total) * 100).toFixed(1)) : 0;
      return { branch: row.branch, total, placed, percentage };
    });

    res.json({
      stats: {
        totalStudents:    parseInt(totalStudentsRes.rows[0].count),
        placedStudents:   parseInt(placedStudentsRes.rows[0].count),
        activeJobs:       parseInt(activeJobsRes.rows[0].count),
        companiesVisited: parseInt(companiesRes.rows[0].count),
      },
      branchPlacements,
    });
  } catch (err) {
    console.error("[GET /stats/overview Error]:", err.message);
    res.status(500).json({ error: "Server Error" });
  }
});

module.exports = router;

const router = require("express").Router();
const pool = require("../config/db");
const authorization = require("../middleware/authorization");

// Create faculty profile
router.post("/", authorization, async (req, res) => {
  try {
    const { dept_id, employee_code, designation } = req.body;
    const newFaculty = await pool.query(
      "INSERT INTO faculty_profiles (user_id, dept_id, employee_code, designation) VALUES($1, $2, $3, $4) RETURNING *",
      [req.user.id, dept_id, employee_code, designation]
    );

    res.json(newFaculty.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// Get faculty profile
router.get("/me", authorization, async (req, res) => {
  try {
    const faculty = await pool.query(
      "SELECT * FROM faculty_profiles WHERE user_id = $1",
      [req.user.id]
    );

    res.json(faculty.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

module.exports = router;

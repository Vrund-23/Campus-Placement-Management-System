const router = require("express").Router();
const pool = require("../config/db");
const authorization = require("../middleware/authorization");

// Create department
router.post("/", async (req, res) => {
  try {
    const { name, code } = req.body;
    const newDepartment = await pool.query(
      "INSERT INTO departments (name, code) VALUES($1, $2) RETURNING *",
      [name, code]
    );

    res.json(newDepartment.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// Get all departments
router.get("/", async (req, res) => {
  try {
    const allDepartments = await pool.query("SELECT * FROM departments");
    res.json(allDepartments.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

module.exports = router;

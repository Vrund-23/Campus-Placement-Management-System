const router = require("express").Router();
const pool = require("../config/db");

// Get all roles
router.get("/", async (req, res) => {
  try {
    const allRoles = await pool.query("SELECT * FROM roles");
    res.json(allRoles.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// Create role
router.post("/", async (req, res) => {
  try {
    const { name } = req.body;
    const newRole = await pool.query(
      "INSERT INTO roles (name) VALUES($1) RETURNING *",
      [name]
    );

    res.json(newRole.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

module.exports = router;

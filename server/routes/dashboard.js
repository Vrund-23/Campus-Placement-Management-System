const router = require("express").Router();
const pool = require("../config/db");
const authorization = require("../middleware/authorization");

router.get("/", authorization, async (req, res) => {
  try {
    const user = await pool.query(
      "SELECT u.user_id, u.email, u.name, u.role_id, u.is_active, r.name as role_name FROM users u JOIN roles r ON u.role_id = r.role_id WHERE u.user_id = $1",
      [req.user.id]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const userData = user.rows[0];

    // Use stored name, fall back to email prefix if not set
    const displayName = userData.name ||
      (userData.email.split('@')[0].charAt(0).toUpperCase() + userData.email.split('@')[0].slice(1));

    res.json({
      ...userData,
      name: displayName
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});


module.exports = router;

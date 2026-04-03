const router = require("express").Router();
const pool = require("../config/db");
const authorization = require("../middleware/authorization");

// Get recent notifications for current user
router.get("/", authorization, async (req, res) => {
  try {
    const notifications = await pool.query(
      "SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20",
      [req.user.id]
    );
    res.json(notifications.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// Mark notification as read
router.put("/:id/read", authorization, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(
      "UPDATE notifications SET is_read = TRUE WHERE notification_id = $1 AND user_id = $2",
      [id, req.user.id]
    );
    res.json({ message: "Notification marked as read" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// Mark all notifications as read
router.put("/read-all", authorization, async (req, res) => {
  try {
    await pool.query(
      "UPDATE notifications SET is_read = TRUE WHERE user_id = $1",
      [req.user.id]
    );
    res.json({ message: "All notifications marked as read" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

module.exports = router;

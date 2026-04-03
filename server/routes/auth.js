const router = require("express").Router();
const pool = require("../config/db");
const bcrypt = require("bcryptjs");
const jwtGenerator = require("../utils/jwtGenerator");
const validInfo = require("../middleware/validInfo");
const authorization = require("../middleware/authorization");

// REGISTER
router.post("/register", validInfo, async (req, res) => {
  try {
    // 1. Destructure the req.body
    const { email, password, role_id, name, department } = req.body;

    // 2. Check if user exists (if user exists then throw error)
    const user = await pool.query("SELECT * FROM users WHERE email = $1", [
      email
    ]);

    if (user.rows.length > 0) {
      return res.status(401).send("User already exists");
    }

    // Lookup dept_id if department name provided
    let dept_id = null;
    if (department) {
      const deptResult = await pool.query("SELECT dept_id FROM departments WHERE name = $1", [department]);
      if (deptResult.rows.length > 0) {
        dept_id = deptResult.rows[0].dept_id;
      }
    }

    // 3. Bcrypt the user password
    const saltRound = 10;
    const salt = await bcrypt.genSalt(saltRound);
    const bcryptPassword = await bcrypt.hash(password, salt);

    // 4. Enter the new user inside our database
    const newUser = await pool.query(
      "INSERT INTO users (email, password_hash, role_id, name) VALUES ($1, $2, $3, $4) RETURNING *",
      [email, bcryptPassword, role_id, name || null]
    );

    const userId = newUser.rows[0].user_id;

    // 5. If it's a student, create a profile
    if (role_id === 1) { // 1 is student
      await pool.query(
        "INSERT INTO student_profiles (user_id, dept_id, enrollment_no) VALUES ($1, $2, $3)",
        [userId, dept_id, `TEMP_${userId}`] // Temporary enrollment no
      );
    }

    // 6. Generating our jwt token
    const token = jwtGenerator(userId);

    res.json({ token, user: newUser.rows[0] });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});


// LOGIN
router.post("/login", validInfo, async (req, res) => {
  try {
    // 1. Destructure the req.body
    const { email, password, role } = req.body;

    // 2. Check if user doesn't exist (if not then allow me to throw error)
    const user = await pool.query(`
      SELECT u.*, r.name as role_name, 
        COALESCE(sd.name, fd.name) as department
      FROM users u 
      LEFT JOIN roles r ON u.role_id = r.role_id 
      LEFT JOIN student_profiles sp ON u.user_id = sp.user_id
      LEFT JOIN departments sd ON sp.dept_id = sd.dept_id
      LEFT JOIN faculty_profiles fp ON u.user_id = fp.user_id
      LEFT JOIN departments fd ON fp.dept_id = fd.dept_id
      WHERE u.email = $1
    `, [email]);

    if (user.rows.length === 0) {
      return res.status(401).json("Password or Email is incorrect");
    }

    // 3. Check if incoming password is the same the database password
    const validPassword = await bcrypt.compare(
      password,
      user.rows[0].password_hash
    );

    if (!validPassword) {
      return res.status(401).json("Password or Email is incorrect");
    }

    // 3.5 Validate selected role matches actual role in DB
    if (role) {
      const actualRole = (user.rows[0].role_name || '').toLowerCase();
      const selectedRole = role.toLowerCase();
      if (actualRole !== selectedRole) {
        return res.status(401).json(`Your account is registered as '${user.rows[0].role_name}'. Please select the correct role.`);
      }
    }

    // 4. Give them the jwt token
    const token = jwtGenerator(user.rows[0].user_id);

    res.json({ token, user: user.rows[0] });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// IS VERIFIED
router.get("/is-verify", authorization, async (req, res) => {
  try {
    res.json(true);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

module.exports = router;

const router = require("express").Router();
const pool = require("../config/db");
const authorization = require("../middleware/authorization");

// Create company
router.post("/", authorization, async (req, res) => {
  try {
    const { name, website } = req.body;
    const newCompany = await pool.query(
      "INSERT INTO companies (name, website) VALUES($1, $2) RETURNING *",
      [name, website]
    );

    res.json(newCompany.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// Get all companies
router.get("/", async (req, res) => {
  try {
    const allCompanies = await pool.query("SELECT DISTINCT ON (LOWER(name)) * FROM companies ORDER BY LOWER(name) ASC, company_id ASC");
    res.json(allCompanies.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// Update company
router.put("/:id", authorization, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, website, is_blacklisted } = req.body;
    
    const updateCompany = await pool.query(
      "UPDATE companies SET name = $1, website = $2, is_blacklisted = $3 WHERE company_id = $4 RETURNING *",
      [name, website, is_blacklisted, id]
    );

    if (updateCompany.rows.length === 0) {
      return res.status(404).json({ error: "Company not found" });
    }

    res.json(updateCompany.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// Delete company
router.delete("/:id", authorization, async (req, res) => {
    try {
        const { id } = req.params;
        const deleteCompany = await pool.query(
            "DELETE FROM companies WHERE company_id = $1 RETURNING *",
            [id]
        );

        if (deleteCompany.rows.length === 0) {
            return res.status(404).json({ error: "Company not found" });
        }

        res.json({ message: "Company deleted successfully" });
    } catch (err) {
        console.error(err.message);
        if (err.code === '23503') { // foreign key violation
            return res.status(400).json({ error: "Cannot delete company with active job postings" });
        }
        res.status(500).send("Server Error");
    }
});

module.exports = router;

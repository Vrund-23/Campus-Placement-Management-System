const pool = require('./server/config/db');

async function fixDuplicates() {
    try {
        console.log("Finding duplicates...");
        const result = await pool.query(`
            DELETE FROM applications
            WHERE app_id NOT IN (
                SELECT MIN(app_id)
                FROM applications
                GROUP BY job_id, student_id
            )
        `);
        console.log(`Deleted ${result.rowCount} duplicate row(s)`);

        try {
            await pool.query('ALTER TABLE applications ADD CONSTRAINT app_job_student_unique UNIQUE (job_id, student_id)');
            console.log("Added unique constraint");
        } catch (e) {
            console.log("Constraint already exists or could not be added:", e.message);
        }

    } catch (e) {
        console.error("Error:", e);
    } finally {
        pool.end();
    }
}

fixDuplicates();

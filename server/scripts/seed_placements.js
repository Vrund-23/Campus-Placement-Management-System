const pool = require('../config/db');
const bcrypt = require('bcryptjs');

const FIRST_NAMES = ['Aarav', 'Vihaan', 'Advait', 'Ishaan', 'Aryan', 'Arjun', 'Reyansh', 'Kabir', 'Vivaan', 'Anya', 'Myra', 'Ananya', 'Kiara', 'Diya', 'Avni', 'Saanvi', 'Riya', 'Shanaya', 'Ira', 'Sara'];
const LAST_NAMES = ['Patel', 'Shah', 'Sharma', 'Gupta', 'Mehta', 'Singh', 'Desai', 'Verma', 'Kumar', 'Reddy', 'Iyer', 'Joshi', 'Kapoor', 'Malhotra', 'Goel', 'Nair', 'Bhat', 'Khan', 'Menon', 'Kulkarni'];
const COMPANIES = ['Google', 'Microsoft', 'Amazon', 'Tata Consultancy Services', 'Infosys', 'Wipro', 'Adobe', 'Intel', 'IBM', 'Oracle', 'Reliance Industries', 'HDFC Bank', 'ICICI Bank'];

async function seed() {
    try {
        console.log('--- Starting Dummy Data Generation ---');
        
        await pool.query("INSERT INTO roles (role_id, name) VALUES (1, 'student') ON CONFLICT (role_id) DO NOTHING");
        
        const deptsRes = await pool.query('SELECT dept_id, name, code FROM departments');
        const departments = deptsRes.rows;
        const years = ['2023-24', '2024-25'];
        const pass = await bcrypt.hash('STU@1234', 10);

        // 1. Create Companies
        const companyIds = [];
        for (const compName of COMPANIES) {
            const res = await pool.query(
                "INSERT INTO companies (name, website) VALUES($1, $2) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING company_id",
                [compName, `https://www.${compName.toLowerCase().replace(/\s/g, '')}.com`]
            );
            companyIds.push(res.rows[0].company_id);
        }
        console.log(`Created/Ensured ${COMPANIES.length} companies.`);

        for (const year of years) {
            console.log(`\n--- Processing Year: ${year} ---`);
            
            // 2. Create Job Postings for this year
            const jobIds = [];
            for (let i = 0; i < 8; i++) {
                const companyId = companyIds[Math.floor(Math.random() * companyIds.length)];
                const jobIdRes = await pool.query(
                    `INSERT INTO job_postings (company_id, title, min_cgpa, deadline, academic_year, is_public, status) 
                     VALUES($1, $2, $3, $4, $5, TRUE, 'CLOSED') RETURNING job_id`,
                    [companyId, `Software Engineer - ${year}`, 6.5, '2024-01-01', year]
                );
                jobIds.push(jobIdRes.rows[0].job_id);
            }
            console.log(`Created 8 job postings for ${year}.`);

            // 3. Create Students and Placements
            for (const dept of departments) {
                console.log(`  Processing Dept: ${dept.name}`);
                for (let i = 1; i <= 20; i++) {
                    const fName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
                    const lName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
                    const name = `${fName} ${lName}`;
                    const email = `${fName.toLowerCase()}.${lName.toLowerCase()}.${year.replace('-','')}.${dept.code.toLowerCase()}.${i}@campus.edu`;
                    const enrollmentNo = `${year.split('-')[0]}${dept.code.toUpperCase()}${i.toString().padStart(3, '0')}`;
                    const cgpa = (7 + Math.random() * 2.5).toFixed(2);
                    const isPlaced = Math.random() < 0.7; 
                    const gender = Math.random() > 0.5 ? 'Male' : 'Female';
                    const passingYear = '20' + year.split('-')[1];

                    try {
                        const newUser = await pool.query(
                            'INSERT INTO users (email, password_hash, role_id, name) VALUES ($1, $2, 1, $3) ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name RETURNING user_id',
                            [email, pass, name]
                        );
                        const userId = newUser.rows[0].user_id;

                        const studentResult = await pool.query(
                            `INSERT INTO student_profiles 
                            (user_id, dept_id, enrollment_no, academic_year, cgpa, is_placed, is_verified, tpc_verified, tpf_verified, tpo_verified, gender, passing_year) 
                            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) 
                            ON CONFLICT ON CONSTRAINT student_profiles_user_year_unique DO UPDATE SET 
                                cgpa = $5, 
                                is_placed = $6, 
                                is_verified = $7, 
                                tpc_verified = $8, 
                                tpo_verified = $10,
                                tpf_verified = $9,
                                academic_year = $4,
                                passing_year = $12
                            RETURNING student_id`,
                            [userId, dept.dept_id, enrollmentNo, year, cgpa, isPlaced, true, true, true, true, gender, passingYear]
                        );
                        const studentId = studentResult.rows[0].student_id;

                        if (isPlaced) {
                            const jobId = jobIds[Math.floor(Math.random() * jobIds.length)];
                            await pool.query(
                                "INSERT INTO applications (job_id, student_id, status) VALUES($1, $2, 'PLACED') ON CONFLICT (job_id, student_id) DO NOTHING",
                                [jobId, studentId]
                            );
                        }
                    } catch (e) {
                        console.error(`Error seeding student ${name}:`, e.message);
                    }
                }
            }
        }

        console.log('\n--- Dummy Data Generation Complete ---');
    } catch (err) {
        console.error('Seeding failed:', err);
    } finally {
        await pool.end();
        process.exit();
    }
}

seed();

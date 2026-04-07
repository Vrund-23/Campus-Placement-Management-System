const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
});

const DEPARTMENTS_MAP = {
  'Computer Engg': 'Computer',
  'Information Tech': 'IT',
  'Electronics Engg': 'Electronics',
  'Mechanical Engg': 'Mechanical',
  'Civil Engg': 'Civil',
  'Production Engg': 'Production',
  'Electrical Engg': 'Electrical',
  'EC Engg': 'EC',
};

async function getDeptId(deptName) {
  const normalized = DEPARTMENTS_MAP[deptName] || deptName;
  const res = await pool.query('SELECT dept_id FROM departments WHERE name = $1 OR code = $1', [normalized]);
  if (res.rows.length === 0) {
    const res2 = await pool.query('SELECT dept_id FROM departments WHERE name ILIKE $1 OR code ILIKE $1', [`%${normalized.trim().split(' ')[0]}%`]);
    if (res2.rows.length > 0) return res2.rows[0].dept_id;
    throw new Error(`Department not found: ${deptName}`);
  }
  return res.rows[0].dept_id;
}

const tpcs2023_24 = [
    { name: 'Aarav Patel', email: 'aarav.patel@gmail.com', department: 'Computer Engg', college_id: '23CP001' },
    { name: 'Riya Shah', email: 'riya.shah@gmail.com', department: 'Computer Engg', college_id: '23CP002' },
    { name: 'Dev Mehta', email: 'dev.mehta@gmail.com', department: 'Information Tech', college_id: '23IT003' },
    { name: 'Krisha Desai', email: 'krisha.desai@gmail.com', department: 'Information Tech', college_id: '23IT004' },
    { name: 'Yash Trivedi', email: 'yash.trivedi@gmail.com', department: 'Mechanical Engg', college_id: '23ME005' },
    { name: 'Neha Joshi', email: 'neha.joshi@gmail.com', department: 'Mechanical Engg', college_id: '23ME006' },
    { name: 'Harsh Modi', email: 'harsh.modi@gmail.com', department: 'Civil Engg', college_id: '23CE007' },
    { name: 'Pooja Patel', email: 'pooja.patel@gmail.com', department: 'Civil Engg', college_id: '23CE008' },
    { name: 'Raj Shah', email: 'raj.shah@gmail.com', department: 'Electrical Engg', college_id: '23EE009' },
    { name: 'Sneha Iyer', email: 'sneha.iyer@gmail.com', department: 'Electrical Engg', college_id: '23EE010' },
    { name: 'Kunal Verma', email: 'kunal.verma@gmail.com', department: 'Electronics Engg', college_id: '23EC011' },
    { name: 'Ananya Singh', email: 'ananya.singh@gmail.com', department: 'Electronics Engg', college_id: '23EC012' },
];

const tpcs2024_25 = [
    { name: 'Vihaan Sharma', email: 'vihaan.sharma@gmail.com', department: 'Computer Engg', college_id: '24CP001' },
    { name: 'Myra Gupta', email: 'myra.gupta@gmail.com', department: 'Computer Engg', college_id: '24CP002' },
    { name: 'Ishaan Malhotra', email: 'ishaan.malhotra@gmail.com', department: 'Information Tech', college_id: '24IT003' },
    { name: 'Avni Rao', email: 'avni.rao@gmail.com', department: 'Information Tech', college_id: '24IT004' },
    { name: 'Aryan Reddy', email: 'aryan.reddy@gmail.com', department: 'Mechanical Engg', college_id: '24ME005' },
    { name: 'Saanvi Kulkarni', email: 'saanvi.kulkarni@gmail.com', department: 'Mechanical Engg', college_id: '24ME006' },
    { name: 'Kabir Das', email: 'kabir.das@gmail.com', department: 'Civil Engg', college_id: '24CE007' },
    { name: 'Diya Menon', email: 'diya.menon@gmail.com', department: 'Civil Engg', college_id: '24CE008' },
    { name: 'Zayan Khan', email: 'zayan.khan@gmail.com', department: 'Electrical Engg', college_id: '24EE009' },
    { name: 'Kiara Bhat', email: 'kiara.bhat@gmail.com', department: 'Electrical Engg', college_id: '24EE010' },
    { name: 'Advait Joshi', email: 'advait.joshi@gmail.com', department: 'Electronics Engg', college_id: '24EC011' },
    { name: 'Anya Saxena', email: 'anya.saxena@gmail.com', department: 'Electronics Engg', college_id: '24EC012' },
];

const tpcs2025_26 = [
    { name: 'Reyansh Singh', email: 'reyansh.singh@gmail.com', department: 'Computer Engg', college_id: '25CP001' },
    { name: 'Sara Ali', email: 'sara.ali@gmail.com', department: 'Computer Engg', college_id: '25CP002' },
    { name: 'Vedant Joshi', email: 'vedant.joshi@gmail.com', department: 'Information Tech', college_id: '25IT003' },
    { name: 'Ira Sharma', email: 'ira.sharma@gmail.com', department: 'Information Tech', college_id: '25IT004' },
    { name: 'Arjun Verma', email: 'arjun.verma@gmail.com', department: 'Mechanical Engg', college_id: '25ME005' },
    { name: 'Riya Nair', email: 'riya.nair@gmail.com', department: 'Mechanical Engg', college_id: '25ME006' },
    { name: 'Dhruv Goel', email: 'dhruv.goel@gmail.com', department: 'Civil Engg', college_id: '25CE007' },
    { name: 'Tanya Gupta', email: 'tanya.gupta@gmail.com', department: 'Civil Engg', college_id: '25CE008' },
    { name: 'Vivaan Kapoor', email: 'vivaan.kapoor@gmail.com', department: 'Electrical Engg', college_id: '25EE009' },
    { name: 'Shanaya Singh', email: 'shanaya.singh@gmail.com', department: 'Electrical Engg', college_id: '25EE010' },
    { name: 'Atharv Patil', email: 'atharv.patil@gmail.com', department: 'Electronics Engg', college_id: '25EC011' },
    { name: 'Navya Shah', email: 'navya.shah@gmail.com', department: 'Electronics Engg', college_id: '25EC012' },
];

async function populateYear(tpcs, year) {
    console.log(`\n--- Populating for ${year} ---`);
    for (const tpc of tpcs) {
        try {
            const deptId = await getDeptId(tpc.department);
            const userRes = await pool.query('SELECT user_id FROM users WHERE email = $1', [tpc.email]);
            if (userRes.rows.length === 0) {
                console.log(`User not found: ${tpc.email}`);
                continue;
            }
            const userId = userRes.rows[0].user_id;

            // Delete any profile for this user search for THIS year specifically
            // To ensure we start clean for this year
            await pool.query('DELETE FROM faculty_profiles WHERE user_id = $1 AND (academic_year = $2 OR academic_year IS NULL)', [userId, year]);
            
            await pool.query(
                'INSERT INTO faculty_profiles (user_id, dept_id, employee_code, designation, academic_year) VALUES ($1, $2, $3, $4, $5)',
                [userId, deptId, tpc.college_id, 'TPC Coordinator', year]
            );
            console.log(`Added TPC ${tpc.name} for ${year}`);
        } catch (e) {
            console.error(`Error for ${tpc.name}: ${e.message}`);
        }
    }
}

async function main() {
    // Clear legacy profiles without years to avoid confusion
    await pool.query("UPDATE faculty_profiles SET academic_year = '2025-26' WHERE academic_year IS NULL");
    
    await populateYear(tpcs2023_24, '2023-24');
    await populateYear(tpcs2024_25, '2024-25');
    await populateYear(tpcs2025_26, '2025-26');
    console.log('\nDone backfilling!');
    process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });

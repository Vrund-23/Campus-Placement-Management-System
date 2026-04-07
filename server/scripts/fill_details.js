const pool = require('../config/db');

async function fillDetails() {
  try {
    console.log('--- Starting to fill missing dummy details ---');
    const updateQuery = `
      UPDATE student_profiles
      SET
        gender = COALESCE(gender, CASE WHEN random() > 0.5 THEN 'Male' ELSE 'Female' END),
        personal_email = COALESCE(personal_email, 'personal_' || substr(md5(random()::text), 1, 6) || '@gmail.com'),
        phone_number = COALESCE(phone_number, '+91' || floor(random() * (9999999999 - 6000000000 + 1) + 6000000000)::text),
        address = COALESCE(address, 'Dummy Address, Block ' || floor(random() * 100 + 1) || ', Some City'),
        date_of_birth = COALESCE(date_of_birth, (timestamp '2000-01-01' + random() * (timestamp '2003-12-31' - timestamp '2000-01-01'))::date),
        linkedin_url = COALESCE(linkedin_url, 'https://linkedin.com/in/dummy-' || substr(md5(random()::text), 1, 8)),
        class_10_percentage = COALESCE(class_10_percentage, floor(random() * (100 - 60 + 1) + 60)),
        class_12_percentage = COALESCE(class_12_percentage, floor(random() * (100 - 60 + 1) + 60)),
        diploma_percentage = COALESCE(diploma_percentage, floor(random() * (100 - 60 + 1) + 60)),
        active_backlogs = COALESCE(active_backlogs, 0),
        total_backlogs = COALESCE(total_backlogs, 0),
        gap_years = COALESCE(gap_years, 0)
      WHERE 
        gender IS NULL 
        OR personal_email IS NULL 
        OR phone_number IS NULL 
        OR address IS NULL
        OR date_of_birth IS NULL
        OR linkedin_url IS NULL
        OR class_10_percentage IS NULL
        OR class_12_percentage IS NULL;
    `;
    const res = await pool.query(updateQuery);
    console.log(`Updated ${res.rowCount} student records with missing dummy details.`);
  } catch (e) {
    console.error('Error filling details:', e);
  } finally {
    pool.end();
  }
}

fillDetails();

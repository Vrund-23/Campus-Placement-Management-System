const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');
const pool = require('../config/db');

async function createTemplates() {
  try {
    const year = '2025-26';
    const folderPath = path.join(__dirname, `../data/students/${year}`);
    
    // Create folder safely if it doesn't exist
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
      console.log(`Created directory: ${folderPath}`);
    }

    // Fetch all departments
    const res = await pool.query('SELECT name FROM departments');
    const departments = res.rows.map(row => row.name);

    if (departments.length === 0) {
      console.log("No departments found in the DB. Halting.");
      return;
    }

    const headers = [
      "Sr.No",
      "Name",
      "CollegeID",
      "Email",
      "Mobile",
      "CPI",
      "Placement Status"
    ];

    // Dummy empty array just containing headers since json_to_sheet creates headers from Object keys
    const emptyData = [
      {
        "Sr.No": "",
        "Name": "",
        "CollegeID": "",
        "Email": "",
        "Mobile": "",
        "CPI": "",
        "Placement Status": ""
      }
    ];

    let count = 0;
    for (const dept of departments) {
      const filePath = path.join(folderPath, `${dept}_Students.xlsx`);
      
      if (!fs.existsSync(filePath)) {
        const wb = xlsx.utils.book_new();
        const ws = xlsx.utils.json_to_sheet(emptyData);
        xlsx.utils.book_append_sheet(wb, ws, "Students");
        xlsx.writeFile(wb, filePath);
        console.log(`Generated template for: ${dept}`);
        count++;
      }
    }
    
    console.log(`Successfully generated ${count} Excel templates for academic year ${year}`);

  } catch (error) {
    console.error("Error creating templates:", error);
  } finally {
    pool.end();
  }
}

createTemplates();

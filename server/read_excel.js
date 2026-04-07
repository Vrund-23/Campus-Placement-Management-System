const xlsx = require('xlsx');
const path = require('path');

const excelPath = 'c:/Users/ASUS/OneDrive/Desktop/DesignEngineering/server/data/students/2023-24/Computer_Students.xlsx';
const workbook = xlsx.readFile(excelPath);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = xlsx.utils.sheet_to_json(sheet);
console.log('Students found:', data.length);
if (data.length > 0) {
  console.log('Header/First Row Keys:', Object.keys(data[0]));
  console.log('First Row:', data[0]);
}
process.exit(0);

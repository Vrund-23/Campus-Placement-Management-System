const xlsx = require('xlsx');
const excelPath = 'c:/Users/ASUS/OneDrive/Desktop/DesignEngineering/server/data/students/2023-24/Computer_Students.xlsx';
const workbook = xlsx.readFile(excelPath);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = xlsx.utils.sheet_to_json(sheet, {header: 1});
console.log('Raw rows found:', data.length);
if (data.length > 0) {
  console.log('Row 0:', data[0]);
  console.log('Row 1:', data[1]);
}
process.exit(0);

const fs = require('fs');
const filePath = 'patient-app/src/screens/PrescriptionScreen.js';
let code = fs.readFileSync(filePath, 'utf8');

code = code.replace(/<Header title="([^"]+)" onBack=\{\(\) => navigation\.goBack\(\)\} \/>/g, '<Header navigation={navigation} />');

fs.writeFileSync(filePath, code, 'utf8');
console.log("Passed navigation to Header in PrescriptionScreen");

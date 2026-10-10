const fs = require('fs');
const filePath = 'patient-app/src/components/Header.js';
let code = fs.readFileSync(filePath, 'utf8');

// The emoji got corrupted to "dY   Back". Let's fix it.
code = code.replace(/dY   Back/g, 'Home');

fs.writeFileSync(filePath, code, 'utf8');
console.log("Fixed button text");

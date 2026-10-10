const fs = require('fs');
const filePath = 'patient-app/src/screens/PrescriptionScreen.js';
let code = fs.readFileSync(filePath, 'utf8');

// Replace styles entirely to add Google Font for Marathi/Hindi/English
const oldStyleBlock = `<style>
                  * { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important; }
                body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; font-size: 16px; padding: 40px; color: #111; line-height: 1.6; }`;

const newStyleBlock = `<style>
                @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;700&family=Noto+Sans:wght@400;700&display=swap');
                * { font-family: 'Noto Sans', 'Noto Sans Devanagari', Arial, sans-serif !important; }
                body { font-size: 16px; padding: 40px; color: #111; line-height: 1.6; }`;

code = code.replace(oldStyleBlock, newStyleBlock);
fs.writeFileSync(filePath, code, 'utf8');
console.log("Updated PDF font to support Marathi via Google Fonts.");

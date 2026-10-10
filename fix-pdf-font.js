const fs = require('fs');
const filePath = 'patient-app/src/screens/PrescriptionScreen.js';
let code = fs.readFileSync(filePath, 'utf8');

// Replace body style
code = code.replace(
  /body \{ font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; padding: 40px; color: #111; line-height: 1\.5; \}/g,
  'body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; font-size: 16px; padding: 40px; color: #111; line-height: 1.6; }'
);

// Add global * selector for fonts
code = code.replace(
  /<style>/g,
  '<style>\n                * { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important; }'
);

fs.writeFileSync(filePath, code, 'utf8');
print("Updated fonts");

const fs = require('fs');
const filePath = 'patient-app/src/components/Header.js';
let code = fs.readFileSync(filePath, 'utf8');

code = code.replace(/<\/TouchableOpacity>\s*<\/View>\s*\);\s*\}/, '</TouchableOpacity>\n      </View>\n    </View>\n  );\n}');

fs.writeFileSync(filePath, code, 'utf8');
console.log("Fixed JSX syntax error using regex!");

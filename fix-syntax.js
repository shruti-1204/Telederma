const fs = require('fs');
const filePath = 'patient-app/src/components/Header.js';
let code = fs.readFileSync(filePath, 'utf8');

// Fix the missing closing View tag
code = code.replace(`      </View>\r\n    );\r\n}`, `      </View>\n    </View>\n  );\n}`);
code = code.replace(`      </View>\n    );\n}`, `      </View>\n    </View>\n  );\n}`);

fs.writeFileSync(filePath, code, 'utf8');
console.log("Fixed JSX syntax error!");

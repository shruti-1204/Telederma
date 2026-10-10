const fs = require('fs');
const filePath = 'patient-app/src/screens/PrescriptionScreen.js';
let code = fs.readFileSync(filePath, 'utf8');

const targetStr = `Download PDF \\uD83D\\uDCE5</Text></TouchableOpacity>`;
const replaceStr = `Download PDF \\uD83D\\uDCE5</Text></TouchableOpacity>
        <TouchableOpacity style={{ backgroundColor: '#F1F5F9', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginBottom: 40, borderWidth: 1, borderColor: '#E2E8F0' }} onPress={() => navigation.navigate('Dashboard')}><Text style={{ color: '#334155', fontSize: 16, fontWeight: '700' }}>Back to Dashboard</Text></TouchableOpacity>`;

code = code.replace(/Download PDF.*<\/TouchableOpacity>/, `Download PDF \uD83D\uDCE5</Text></TouchableOpacity>\n        <TouchableOpacity style={{ backgroundColor: '#F1F5F9', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginBottom: 40, borderWidth: 1, borderColor: '#E2E8F0', marginTop: 10 }} onPress={() => navigation.navigate('Dashboard')}><Text style={{ color: '#334155', fontSize: 16, fontWeight: '700' }}>Back to Dashboard</Text></TouchableOpacity>`);

fs.writeFileSync(filePath, code, 'utf8');
console.log("Added Back to Dashboard button at bottom of PrescriptionScreen");

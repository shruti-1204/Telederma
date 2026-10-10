const fs = require('fs');
const filePath = 'patient-app/src/components/Header.js';
let code = fs.readFileSync(filePath, 'utf8');

const targetStr = `{/* User profile & settings shortcut */}`;
const replaceStr = `
      <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation?.navigate('Dashboard')}
          activeOpacity={0.8}
        >
          <Text style={styles.backBtnText}>dY   Back</Text>
        </TouchableOpacity>
        
        {/* User profile & settings shortcut */}`;

code = code.replace(targetStr, replaceStr);

const targetStrClose = `</TouchableOpacity>
    </View>`;
const replaceStrClose = `</TouchableOpacity>
      </View>
    </View>`;
code = code.replace(targetStrClose, replaceStrClose);

const stylesTarget = `  userChip: {`;
const stylesReplace = `  backBtn: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  backBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  userChip: {`;

code = code.replace(stylesTarget, stylesReplace);

fs.writeFileSync(filePath, code, 'utf8');
console.log("Added Back to Dashboard button to Header");

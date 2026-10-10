const fs = require('fs');
const path = require('path');

const NEW_IP = '10.149.64.233';
const REGEX_IP = /192\.168\.\d+\.\d+/g;
let replacedFiles = [];

function walk(dir) {
    if (dir.includes('node_modules') || dir.includes('.git') || dir.includes('.expo')) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walk(fullPath);
        } else if (fullPath.endsWith('.js') || fullPath.endsWith('.env') || fullPath.endsWith('.ts')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            if (REGEX_IP.test(content)) {
                content = content.replace(REGEX_IP, NEW_IP);
                fs.writeFileSync(fullPath, content, 'utf8');
                replacedFiles.push(fullPath);
            }
        }
    }
}

walk('.');
console.log("Updated IP in files:", replacedFiles);

const fs = require('fs');
const path = require('path');

const screensPath = path.join(__dirname, 'src', 'screens');
const files = fs.readdirSync(screensPath);

const colorMap = {
  '#3182CE': '#0F6B59', // Primary Blue -> Primary Teal (Buttons, Active Tabs)
  '#1A365D': '#113F36', // Dark Blue -> Dark Green/Teal (Headings)
  '#0066cc': '#0F6B59', // Standard Blue -> Primary Teal
  '#102a43': '#113F36', // Dark Navy Text -> Dark Teal Text
  '#1e1e1e': '#122723', // Video Call Dark BG -> Very Dark Teal BG
  '#000000': '#122723', // Black Video Section -> Very Dark Teal
  '#333': '#24453F',    // Dark Gray Controls -> Medium Teal Controls
  '#555': '#38635B',    // Lighter Gray Controls -> Lighter Teal Controls
  '#F4F7FA': '#F2F7F6', // Dashboard BG -> Very Light Mint BG
  '#EDF2F7': '#E8F3F1'  // Light Gray cards/tabs -> Light Mint cards
};

files.forEach(file => {
  if (file.endsWith('.js')) {
    const filePath = path.join(screensPath, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    let modified = false;
    for (let [oldColor, newColor] of Object.entries(colorMap)) {
       const regex = new RegExp(oldColor, 'gi');
       if (regex.test(content)) {
           content = content.replace(regex, newColor);
           modified = true;
       }
    }
    
    if (modified) {
      fs.writeFileSync(filePath, content);
      console.log('Updated colors in: ' + file);
    }
  }
});

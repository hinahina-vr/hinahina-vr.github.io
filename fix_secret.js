const fs = require('fs');
let lines = fs.readFileSync('secret_0x.html', 'utf8').split('\n');

// Fix #emsg: remove white-space:nowrap, add word-break and max-width
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('#emsg{') && lines[i].includes('white-space:nowrap')) {
    lines[i] = lines[i].replace('white-space:nowrap;width:100%', 'white-space:pre-wrap;word-break:break-word;max-width:90vw;box-sizing:border-box');
    console.log('Fixed emsg wrapping');
    break;
  }
}

// Add mobile-specific font size reduction
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('#entry{')) {
    lines[i] = lines[i].replace('padding:0 24px;width:95vw', 'padding:0 16px;width:90vw;max-width:900px');
    console.log('Fixed entry padding');
    break;
  }
}

fs.writeFileSync('secret_0x.html', lines.join('\n'), 'utf8');
console.log('Done!');

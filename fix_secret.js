const fs = require('fs');
let lines = fs.readFileSync('secret_0x.html', 'utf8').split('\n');

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('#emsg{') && lines[i].includes('pre-wrap')) {
    lines[i] = " #emsg{white-space:pre-wrap;word-break:break-word;font-size:clamp(.65rem,3.2vw,1rem)}";
    console.log('Reduced mobile emsg font size');
    break;
  }
}

fs.writeFileSync('secret_0x.html', lines.join('\n'), 'utf8');
console.log('Done!');

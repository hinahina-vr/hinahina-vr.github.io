const fs = require('fs');
let lines = fs.readFileSync('secret_0x.html', 'utf8').split('\n');

// 1. Noise start delay: 2250 → 3375 (×1.5)
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('},2250);')) {
    lines[i] = lines[i].replace(',2250);', ',3375);');
    console.log('Noise start delay: 2250→3375');
    break;
  }
}

// 2. Simplify block noise: remove t-based size scaling (keep blocks large, uniform)
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('const t=Math.min(count/100,1);')) {
    // Remove t line and simplify bw/bh to fixed random sizes
    lines[i] = ''; // remove t line
    lines[i+1] = '    const bw=Math.random()*60+10;'; // fixed block width
    lines[i+2] = '    const bh=Math.random()*30+5;';  // fixed block height
    console.log('Simplified block noise (no scaling)');
    break;
  }
}

fs.writeFileSync('secret_0x.html', lines.join('\n'), 'utf8');
console.log('Done!');

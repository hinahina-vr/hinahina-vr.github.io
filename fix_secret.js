const fs = require('fs');
let lines = fs.readFileSync('secret_0x.html', 'utf8').split('\n');

// 1. Noise start delay: 1500 → 2250 (×1.5)
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('},1500);') && lines[i-1] && lines[i-1].includes(',1800);')) {
    lines[i] = lines[i].replace(',1500);', ',2250);');
    console.log('Noise start delay: 1500→2250');
    break;
  }
}

// 2. Light pillar drift: 0.3 → 2.0 (much more horizontal movement)
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("drift:(Math.random()-0.5)*0.3")) {
    lines[i] = lines[i].replace("drift:(Math.random()-0.5)*0.3", "drift:(Math.random()-0.5)*2.0+((Math.random()>0.5)?0.5:-0.5)");
    console.log('Pillar drift: 0.3→2.0');
    break;
  }
}

// 3. Add sinusoidal horizontal oscillation to pillar movement in drawKongou
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('p.x+=p.drift;') && lines[i+1] && lines[i+1].includes('p.x<-100')) {
    lines[i] = '  p.x+=p.drift+Math.sin(t*0.8+p.phase)*1.5;';
    console.log('Added pillar horizontal oscillation');
    break;
  }
}

fs.writeFileSync('secret_0x.html', lines.join('\n'), 'utf8');
console.log('Done!');

const fs = require('fs');
let lines = fs.readFileSync('secret_0x.html', 'utf8').split('\n');

// 1. Replace #nrvn CSS: same size as #ret + glitchy dark design
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('#nrvn{margin-top:1rem')) {
    lines[i] = '#nrvn{margin-top:1.5rem;padding:16px 48px;background:rgba(20,0,30,.3);border:1px solid rgba(120,40,80,.3);color:rgba(160,80,120,.5);text-decoration:none;border-radius:30px;z-index:100;opacity:0;transition:opacity 2s ease,background .3s,color .3s,text-shadow .3s;pointer-events:none;letter-spacing:5px;font-size:1rem;font-family:inherit;cursor:pointer;white-space:nowrap;text-shadow:0 0 4px rgba(160,40,80,.3);position:relative}';
    console.log('Updated nrvn base CSS');
    break;
  }
}
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('#nrvn:hover{')) {
    lines[i] = '#nrvn:hover{background:rgba(60,0,30,.4);color:rgba(200,60,100,.7);border-color:rgba(180,40,80,.5);text-shadow:0 0 8px rgba(200,40,80,.5),0 0 20px rgba(160,0,60,.3);animation:glitch-text .15s infinite}';
    // Add glitch animation after
    lines.splice(i + 1, 0,
      '@keyframes glitch-text{0%{transform:translate(0)}20%{transform:translate(-2px,1px)}40%{transform:translate(2px,-1px)}60%{transform:translate(-1px,-2px)}80%{transform:translate(1px,2px)}100%{transform:translate(0)}}'
    );
    console.log('Updated nrvn hover + glitch animation');
    break;
  }
}

// 2. Remove nehan-mitra vertical CSS (revert to horizontal)
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('#entry.nehan-mitra{')) {
    // Remove 4 lines of nehan-mitra CSS
    let count = 0;
    while (count < 4 && i < lines.length) {
      if (lines[i].includes('nehan-mitra')) {
        lines.splice(i, 1);
        count++;
      } else {
        break;
      }
    }
    console.log('Removed nehan-mitra vertical CSS (' + count + ' lines)');
    break;
  }
}

// 3. Remove nehan-mitra class add/remove from nehan() JS
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("classList.add('nehan-mitra')")) {
    lines.splice(i, 1);
    console.log('Removed nehan-mitra add');
    break;
  }
}
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("classList.remove('nehan-mitra')")) {
    lines.splice(i, 1);
    console.log('Removed nehan-mitra remove');
    break;
  }
}

// 4. CRT puchun: add border-radius for spherical CRT look 
// Add border-radius to #book for the rounded CRT edge effect
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('#book{') && lines[i].includes('position:fixed')) {
    // Add overflow:hidden and border-radius
    lines[i] = lines[i].replace('display:flex;', 'display:flex;overflow:hidden;border-radius:12px;');
    console.log('Added CRT border-radius to #book');
    break;
  }
}

// 5. Update crt-off animation with border-radius shrinking for spherical feel
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('@keyframes crt-off{')) {
    // Find and replace the whole animation
    let end = i;
    while (end < lines.length && !lines[end].includes('}') || end === i) end++;
    // end should be at the closing } of the last keyframe, then one more for the outer }
    // Let me find it properly
    let braces = 0;
    for (let j = i; j < lines.length; j++) {
      braces += (lines[j].match(/{/g)||[]).length;
      braces -= (lines[j].match(/}/g)||[]).length;
      if (braces === 0) { end = j; break; }
    }
    lines.splice(i, end - i + 1,
      '@keyframes crt-off{',
      ' 0%{transform:scale(1,1);filter:brightness(1);opacity:1;border-radius:12px}',
      ' 30%{transform:scale(1.02,.85);filter:brightness(1.5);border-radius:20px}',
      ' 50%{transform:scale(1.05,.15);filter:brightness(2.5);border-radius:40px}',
      ' 70%{transform:scale(.8,.008);filter:brightness(4);opacity:1;border-radius:50%}',
      ' 85%{transform:scale(.4,.004);filter:brightness(6);opacity:.7;border-radius:50%}',
      ' 100%{transform:scale(0,.001);filter:brightness(8);opacity:0;border-radius:50%}',
      '}'
    );
    console.log('Updated crt-off with spherical border-radius');
    break;
  }
}

// Also add a CRT vignette effect to #book with box-shadow
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('#book{') && lines[i].includes('border-radius:12px')) {
    lines[i] = lines[i].replace('border-radius:12px;', 'border-radius:12px;box-shadow:inset 0 0 80px rgba(0,0,0,.4),inset 0 0 200px rgba(0,0,0,.2);');
    console.log('Added CRT vignette box-shadow');
    break;
  }
}

// Also update the initial .bsod-wrap puchun for spherical feel
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('#bsod-wrap.puchun')) {
    // Check if it already has border-radius
    if (!lines[i].includes('border-radius')) {
      lines[i] = lines[i].replace('forwards}', 'forwards;border-radius:50%}').replace('forwards;border-radius:50%;border-radius:50%', 'forwards;border-radius:50%');
      console.log('Added spherical to bsod puchun');
    }
    break;
  }
}

fs.writeFileSync('secret_0x.html', lines.join('\n'), 'utf8');
console.log('Done!');

const fs = require('fs');
let lines = fs.readFileSync('secret_0x.html', 'utf8').split('\n');

// 1. Reduce border-radius to 1/8: 12px → 2px on #book
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('#book{') && lines[i].includes('border-radius:12px')) {
    lines[i] = lines[i].replace('border-radius:12px', 'border-radius:2px');
    console.log('Reduced #book border-radius to 2px');
    break;
  }
}

// 2. Rewrite crt-off animation: CRT horizontal line collapse like real TV
// Phase 1: Image squishes vertically into a bright horizontal line
// Phase 2: The horizontal line shrinks to a bright dot
// Phase 3: Dot afterglow and fade
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('@keyframes crt-off{')) {
    let braces = 0, end = i;
    for (let j = i; j < lines.length; j++) {
      braces += (lines[j].match(/{/g)||[]).length;
      braces -= (lines[j].match(/}/g)||[]).length;
      if (braces === 0) { end = j; break; }
    }
    lines.splice(i, end - i + 1,
      '@keyframes crt-off{',
      ' 0%{transform:scale(1,1);filter:brightness(1);opacity:1;border-radius:2px}',
      ' 25%{transform:scale(1.01,.4);filter:brightness(1.8);border-radius:3px}',
      ' 45%{transform:scale(1.02,.02);filter:brightness(4);border-radius:4px}',
      ' 55%{transform:scale(.7,.008);filter:brightness(6);opacity:1;border-radius:6px}',
      ' 70%{transform:scale(.3,.006);filter:brightness(8);opacity:.9;border-radius:6px}',
      ' 85%{transform:scale(.05,.005);filter:brightness(10);opacity:.7;border-radius:50%}',
      ' 100%{transform:scale(0,0);filter:brightness(12);opacity:0;border-radius:50%}',
      '}'
    );
    console.log('Rewrote crt-off for CRT horizontal line collapse');
    break;
  }
}

// 3. Make exit-puchun animation longer to see the effect
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('#book.exit-puchun{animation:crt-off')) {
    lines[i] = '#book.exit-puchun{animation:crt-off 1s cubic-bezier(.4,0,1,1) forwards}';
    console.log('Extended crt-off to 1s');
    break;
  }
}

// 4. Also add a CRT afterglow: white dot/line overlay that lingers
// Use the white-flash element for afterglow
// Find the puchun exit sequence in gedatsu
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("classList.add('exit-puchun')") && i > 400) {
    // After adding exit-puchun class, show a brief centered white line
    lines.splice(i + 1, 0,
      "  // CRT afterglow: bright line lingers",
      "  const wfg=document.getElementById('white-flash');",
      "  wfg.style.cssText='position:absolute;left:50%;top:50%;width:60%;height:3px;transform:translate(-50%,-50%);background:radial-gradient(ellipse at center,rgba(255,255,255,.9),rgba(255,255,255,.3) 40%,transparent 70%);opacity:1;z-index:600;pointer-events:none;transition:none;border-radius:0';",
      "  await delay(400);",
      "  wfg.style.transition='opacity 1.2s ease,width 1.2s ease';",
      "  wfg.style.width='0%';wfg.style.opacity='0';",
    );
    console.log('Added CRT afterglow effect');
    break;
  }
}

fs.writeFileSync('secret_0x.html', lines.join('\n'), 'utf8');
console.log('Done!');

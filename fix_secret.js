const fs = require('fs');
let lines = fs.readFileSync('secret_0x.html', 'utf8').split('\n');

// 1. Hide nrvn button in gedatsu (目覚める clicked)
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("async function gedatsu()")) {
    // Find retEl hide line
    for (let j = i; j < i + 10; j++) {
      if (lines[j].includes("retEl.classList.remove('vis')") && lines[j].includes("display='none'")) {
        lines.splice(j + 1, 0,
          " const nrvnEl=document.getElementById('nrvn');if(nrvnEl){nrvnEl.classList.remove('vis');nrvnEl.style.pointerEvents='none';nrvnEl.style.display='none';}"
        );
        console.log('Hide nrvn in gedatsu');
        break;
      }
    }
    break;
  }
}

// 2. Remove broken wfg line (leftover from afterglow)
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("wfg.style.width='0%';wfg.style.opacity='0';")) {
    lines.splice(i, 1);
    console.log('Removed broken wfg line');
    break;
  }
}

// 3. Fix position jumping: add min-height to #emsg so layout is stable
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('#emsg{') && lines[i].includes('white-space:nowrap')) {
    lines[i] = lines[i].replace('#emsg{', '#emsg{min-height:6em;');
    console.log('Added min-height to #emsg');
    break;
  }
}

fs.writeFileSync('secret_0x.html', lines.join('\n'), 'utf8');
console.log('Done!');

const fs = require('fs');
let lines = fs.readFileSync('secret_0x.html', 'utf8').split('\n');

// 1. Add HTML: 涅槃ボタン after 目覚めるボタン
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('id="ret"') && lines[i].includes('gedatsu()')) {
    lines.splice(i + 1, 0,
      ' <button id="nrvn" onclick="nehan()">涅槃に入る</button>'
    );
    console.log('Added nehan button HTML');
    break;
  }
}

// 2. Add CSS for 涅槃ボタン (same style as #ret but slightly different color)
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('#ret:hover{')) {
    lines.splice(i + 1, 0,
      '#nrvn{margin-top:1rem;padding:12px 36px;background:rgba(100,50,120,.08);border:1px solid rgba(160,100,200,.2);color:rgba(180,140,220,.45);text-decoration:none;border-radius:30px;z-index:100;opacity:0;transition:opacity 2s ease,background .3s,color .3s;pointer-events:none;letter-spacing:3px;font-size:.85rem;font-family:inherit;cursor:pointer;white-space:nowrap}',
      '#nrvn.vis{opacity:1;pointer-events:auto}',
      '#nrvn:hover{background:rgba(100,50,120,.2);color:rgba(200,160,240,.7);border-color:rgba(160,100,200,.4)}'
    );
    console.log('Added nehan CSS');
    break;
  }
}

// 3. Add charCount tracking and show nehan button after 3 chars in play()
// Insert counter before the play function
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('let currentChar=null;')) {
    lines[i] = 'let currentChar=null;let charDisplayCount=0;';
    console.log('Added charDisplayCount');
    break;
  }
}

// Show nehan button inside the loop after 3 characters displayed
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('currentChar=c;')) {
    lines.splice(i + 1, 0,
      "   charDisplayCount++;",
      "   const nrvnEl=document.getElementById('nrvn');",
      "   if(charDisplayCount>=3&&nrvnEl){nrvnEl.classList.add('vis');nrvnEl.style.pointerEvents='auto';}"
    );
    console.log('Added nehan button show logic');
    break;
  }
}

// 4. Add the nehan() function before gedatsu() 
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('async function gedatsu()')) {
    lines.splice(i, 0,
      '// === Nehan: 涅槃 – surrender to the void ===',
      'async function nehan(){',
      ' playing=false;',
      ' removeCursor();',
      " const retEl=document.getElementById('ret');",
      " const nrvnEl=document.getElementById('nrvn');",
      " retEl.classList.remove('vis');retEl.style.pointerEvents='none';",
      " nrvnEl.classList.remove('vis');nrvnEl.style.pointerEvents='none';",
      '',
      ' // Slow fade to darkness',
      " msgEl.style.transition='opacity 3s ease';",
      " nameEl.style.transition='opacity 3s ease';",
      " srcEl.style.transition='opacity 3s ease';",
      " msgEl.style.opacity='0';",
      " nameEl.style.opacity='0';",
      " srcEl.style.opacity='0';",
      ' await delay(2000);',
      '',
      ' // Stop particles, darken everything',
      ' particlesActive=false;',
      " px.clearRect(0,0,pc.width,pc.height);",
      '',
      " // Fade book to pure black",
      " const book=document.getElementById('book');",
      " book.style.transition='background 4s ease';",
      " book.style.background='#000';",
      ' await delay(4000);',
      '',
      ' // Brief moment of absolute nothing',
      ' await delay(3000);',
      '',
      " // Mitra speaks from the void",
      " nameEl.textContent='ミトラ・マイトレーヤ';",
      " srcEl.textContent='ワディーゲストハウス';",
      " nameEl.style.transition='opacity 2s ease';",
      " srcEl.style.transition='opacity 2s ease';",
      " nameEl.style.opacity='';srcEl.style.opacity='';",
      " nameEl.classList.add('vis');srcEl.classList.add('vis');",
      " msgEl.style.transition='';msgEl.style.opacity='1';",
      ' await delay(1000);',
      " await typewrite('汝は我……我は汝……');",
      ' await delay(2000);',
      ' removeCursor();',
      " msgEl.style.opacity='0';",
      ' await delay(1000);',
      " msgEl.innerHTML='';msgEl.style.opacity='1';",
      " await typewrite('汝は斃れた。\\nそして、立つことを拒んだ。\\n\\n此処は虚無の底──\\n音も光も、意味すら届かぬ場所。\\n\\n……眠れ。永く。');",
      ' await delay(6000);',
      ' removeCursor();',
      '',
      ' // Final fade',
      " msgEl.style.transition='opacity 4s ease';",
      " nameEl.style.transition='opacity 4s ease';",
      " srcEl.style.transition='opacity 4s ease';",
      " msgEl.style.opacity='0';",
      " nameEl.style.opacity='0';",
      " srcEl.style.opacity='0';",
      ' await delay(5000);',
      '',
      ' // Redirect to diary (even the void has an exit)',
      " location.href='diary.html';",
      '}',
      '',
    );
    console.log('Added nehan() function');
    break;
  }
}

fs.writeFileSync('secret_0x.html', lines.join('\n'), 'utf8');
console.log('Done!');

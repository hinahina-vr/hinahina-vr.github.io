const fs = require('fs');
let lines = fs.readFileSync('secret_0x.html', 'utf8').split('\n');

// 1. Revert #emsg back to white-space:nowrap + width:100%
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('#emsg{') && lines[i].includes('pre-wrap')) {
    lines[i] = lines[i].replace('white-space:pre-wrap;word-break:break-word;max-width:90vw;box-sizing:border-box', 'white-space:nowrap;width:100%');
    console.log('Reverted emsg to nowrap');
    break;
  }
}

// 2. Revert #entry padding
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('#entry{') && lines[i].includes('max-width:900px')) {
    lines[i] = lines[i].replace('padding:0 16px;width:90vw;max-width:900px', 'padding:0 24px;width:95vw');
    console.log('Reverted entry padding');
    break;
  }
}

// 3. Add mobile-only media query before </style>
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('</style>')) {
    lines.splice(i, 0,
      '@media(max-width:768px){',
      ' #emsg{white-space:pre-wrap;word-break:break-word;font-size:clamp(.8rem,4vw,1.2rem)}',
      ' #ename{font-size:clamp(.9rem,5vw,1.4rem)}',
      ' #entry{padding:0 16px;width:92vw}',
      '}'
    );
    console.log('Added mobile media query');
    break;
  }
}

fs.writeFileSync('secret_0x.html', lines.join('\n'), 'utf8');
console.log('Done!');

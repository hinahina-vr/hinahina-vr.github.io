const fs = require('fs');

// Fix build-diary-feiris.mjs
let feiris = fs.readFileSync('scripts/build-diary-feiris.mjs', 'utf8');
feiris = feiris.replace(
  '    </main>\r\n  </body>',
  '    </main>\r\n    <script src="./galge-launcher.js"></script>\r\n  </body>'
);
fs.writeFileSync('scripts/build-diary-feiris.mjs', feiris, 'utf8');
console.log('feiris done');

// Fix build-diary-ayu.mjs
let ayu = fs.readFileSync('scripts/build-diary-ayu.mjs', 'utf8');
ayu = ayu.replace(
  '    </main>\r\n  </body>',
  '    </main>\r\n    <script src="./galge-launcher.js"></script>\r\n  </body>'
);
fs.writeFileSync('scripts/build-diary-ayu.mjs', ayu, 'utf8');
console.log('ayu done');

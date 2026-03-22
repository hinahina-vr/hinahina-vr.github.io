import fs from 'fs';
import path from 'path';

const dirs = fs.readdirSync('.', { Boolean: true, withFileTypes: true })
    .filter(e => e.isDirectory() && e.name.startsWith('diary-'))
    .map(e => e.name);

for (const dir of dirs) {
    const files = fs.readdirSync(dir);
    
    const files21 = files.filter(f => f.startsWith('2026-03-21') && f.endsWith('.md'));
    if (files21.length > 1) {
        console.log(`DUPLICATE in ${dir} for 3/21: `, files21);
    }
    
    const files22 = files.filter(f => f.startsWith('2026-03-22') && f.endsWith('.md'));
    if (files22.length > 1) {
        console.log(`DUPLICATE in ${dir} for 3/22: `, files22);
    }
}

import fs from 'fs';
import path from 'path';

const entries = fs.readdirSync('.', { withFileTypes: true });
const dirs = entries.filter(e => e.isDirectory() && e.name.startsWith('diary-')).map(e => e.name);
for (const dir of dirs) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        if (!file.endsWith('.md')) continue;
        const filepath = path.join(dir, file);
        const content = fs.readFileSync(filepath, 'utf8');
        const lines = content.split('\n');
        
        let titleLine = '';
        for (const line of lines) {
            if (line.startsWith('# 2026-03-21 ') || line.startsWith('# 2026-03-22 ')) {
                titleLine = line;
                break;
            }
        }
        
        if (titleLine) {
            const m = titleLine.match(/^# (2026-03-2[12]) (.*)$/);
            if (m) {
                const date = m[1];
                let title = m[2].trim().replace(/[\\/:*?"<>|]/g, '');
                const newFilename = `${date}_${title}.md`;
                if (file !== newFilename) {
                    console.log(`Renaming: ${dir}/${file} -> ${newFilename}`);
                    fs.renameSync(filepath, path.join(dir, newFilename));
                }
            }
        }
    }
}

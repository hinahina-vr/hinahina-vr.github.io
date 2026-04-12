import path from "node:path";
import {
  collectDiaryMarkdownFiles,
  readDiaryFile,
  replaceSelfDateMentionsInBody,
  repoRoot,
  splitDiaryMarkdown,
  writeDiaryFile,
} from "./lib/diary-self-date.mjs";

function parseArgs(argv) {
  const args = { date: null };

  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--date") {
      args.date = argv[i + 1] ?? null;
      i += 1;
    }
  }

  return args;
}

const { date: requestedDate } = parseArgs(process.argv.slice(2));
const files = collectDiaryMarkdownFiles().filter((file) => !requestedDate || file.date === requestedDate);

let changed = 0;

for (const file of files) {
  const markdown = readDiaryFile(file);
  const { heading, body, trailer } = splitDiaryMarkdown(markdown);
  const nextBody = replaceSelfDateMentionsInBody(body, file.date);

  if (nextBody === body) continue;

  writeDiaryFile(file, `${heading}${nextBody}${trailer}`);
  console.log(`fixed: ${path.relative(repoRoot, file.fullPath)}`);
  changed += 1;
}

console.log(`updated ${changed} file(s).`);

import {
  downloadYoutubeMp3,
  parseArgs,
  renderHelpText,
} from "./lib/youtube-mp3.mjs";

async function main() {
  let options;
  try {
    options = parseArgs(process.argv);
  } catch (error) {
    console.error(error.message);
    console.error("");
    console.error(renderHelpText());
    process.exit(1);
  }

  if (options.help) {
    console.log(renderHelpText());
    return;
  }

  try {
    const files = await downloadYoutubeMp3(options);
    console.log(`Downloaded ${files.length} file(s).`);
    for (const filePath of files) {
      console.log(filePath);
    }
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

main();

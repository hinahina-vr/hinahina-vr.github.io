import { collectStudyIssues, loadStudyData } from "./lib/study.mjs";

async function main() {
  const studyData = loadStudyData();
  const issues = collectStudyIssues(studyData);

  if (issues.length) {
    console.error("Study validation failed:");
    for (const issue of issues) {
      console.error(`- ${issue}`);
    }
    process.exit(1);
  }

  const subjectCount = studyData.length;
  const chapterCount = studyData.reduce((total, subject) => total + subject.chapters.length, 0);
  console.log(`✓ check:study passed (${subjectCount} subject, ${chapterCount} chapter)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

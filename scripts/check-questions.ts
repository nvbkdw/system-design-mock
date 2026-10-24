// Validates questions/*.md without building the site: npm run check:questions
import { loadQuestionBank } from "../plugins/questionBank";

const { questions, errors } = loadQuestionBank();
if (errors.length) {
  console.error(`✗ ${errors.length} problem(s) in the question bank:\n` + errors.map((e) => "  - " + e).join("\n"));
  process.exit(1);
}
console.log(`✓ ${questions.length} questions are valid`);

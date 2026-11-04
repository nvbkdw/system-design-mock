// Prompt for getting critical feedback on an exported answer. Shown on the home
// page and placed at the top of every Markdown export as instructions, so it
// must read correctly in either place (no "below"/"above").
export const FEEDBACK_PROMPT = `You are a staff software engineer, you are interviewing me for system design round in a 60-minute technical interview. 
This file contains my answer from this interview, exported as Markdown.

1. Grade each phase and the whole design (strong / acceptable / weak) and explain why.
2. List the most important gaps or mistakes, including wrong estimates and missing trade-offs.
3. Point out failure modes I didn't consider.
4. Say what a strong candidate would have done differently, and what I should practice next.

Be direct and specific. Don't soften the feedback.`;

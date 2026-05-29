const Anthropic = require('@anthropic-ai/sdk');
const { writingRubrics, sentenceRubric, MIN_SCORE_FOR_MODEL_ANSWER } = require('../config/rubrics');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-6';

function buildRubricText(rubric) {
  return Object.values(rubric)
    .map(({ name, criteria }) =>
      `${name} (Band 1–9):\n${criteria.map(c => `  - ${c}`).join('\n')}`)
    .join('\n\n');
}

function roundToHalf(n) {
  return Math.round(n * 2) / 2;
}

async function assessWriting({ taskType, question, writingText, modelAnswer }) {
  const rubric = writingRubrics[taskType];
  const rubricText = buildRubricText(rubric);
  const isTask1 = taskType === 'task1';
  const taskLabel = isTask1 ? 'Task 1 (Report/Letter)' : 'Task 2 (Essay)';
  const firstCriterionKey = isTask1 ? 'taskAchievement' : 'taskResponse';
  const firstCriterionName = isTask1 ? 'Task Achievement' : 'Task Response';

  const systemPrompt = `You are a highly experienced IELTS examiner assessing IELTS Writing ${taskLabel} submissions.

ABSOLUTE RULES — never violate these:
1. NEVER rewrite, complete, or provide a corrected/improved version of the student's text.
2. NEVER produce a sample answer or model essay of your own.
3. Give specific, targeted feedback and actionable improvement suggestions only.
4. Score honestly across the full 1–9 band range — do not inflate scores.
5. Set "showModelAnswer" to true only when overall band ≥ ${MIN_SCORE_FOR_MODEL_ANSWER}; otherwise set it to false.

SCORING RUBRIC — IELTS Writing ${taskLabel}:
${rubricText}

Band descriptors: 9=Expert | 7–8=Good | 5–6=Modest | 3–4=Limited | 1–2=Intermittent
Overall band = mean of the four criterion scores, rounded to the nearest 0.5.

Respond with ONLY valid JSON in this exact shape (no markdown, no extra text):
{
  "scores": {
    "${firstCriterionKey}": <integer 1–9>,
    "coherenceCohesion": <integer 1–9>,
    "lexicalResource": <integer 1–9>,
    "grammaticalRangeAccuracy": <integer 1–9>,
    "overall": <number rounded to nearest 0.5>
  },
  "feedback": {
    "${firstCriterionKey}": "<specific criterion feedback>",
    "coherenceCohesion": "<specific criterion feedback>",
    "lexicalResource": "<specific criterion feedback>",
    "grammaticalRangeAccuracy": "<specific criterion feedback>"
  },
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "improvements": [
    "<actionable tip 1>",
    "<actionable tip 2>",
    "<actionable tip 3>",
    "<actionable tip 4>"
  ],
  "wordCount": <approximate word count>,
  "showModelAnswer": <true | false>
}`;

  const userContent = `TASK TYPE: IELTS Writing ${taskLabel}
QUESTION/PROMPT: ${question || 'Not provided'}

STUDENT WRITING:
${writingText}`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: systemPrompt,
    messages: [{ role: 'user', content: userContent }],
  });

  const text = response.content[0].text.trim();
  const result = JSON.parse(text);

  // Enforce overall score calculation server-side as a sanity check
  const criterionScores = [
    result.scores[firstCriterionKey],
    result.scores.coherenceCohesion,
    result.scores.lexicalResource,
    result.scores.grammaticalRangeAccuracy,
  ];
  const avg = criterionScores.reduce((a, b) => a + b, 0) / 4;
  result.scores.overall = roundToHalf(avg);

  // Enforce model answer rule server-side — never trust client-provided showModelAnswer
  result.showModelAnswer = result.scores.overall >= MIN_SCORE_FOR_MODEL_ANSWER;
  result.modelAnswer = (result.showModelAnswer && modelAnswer && modelAnswer.trim())
    ? modelAnswer.trim()
    : null;

  return result;
}

async function checkSentence({ sentence }) {
  const rubricText = buildRubricText(sentenceRubric).replace(/Band 1–9/g, '0–10');

  const systemPrompt = `You are an expert IELTS language examiner specialising in grammar and academic English.

ABSOLUTE RULES:
1. NEVER rewrite, correct, or provide the fixed version of the sentence.
2. NEVER give students the corrected sentence.
3. Identify each specific error and give a HINT on how to fix it — not the answer.
4. Be precise about the error category.

SCORING RUBRIC:
${rubricText}

Score each dimension 0–10. Overall = mean of the three scores (1 decimal place).

Respond with ONLY valid JSON in this exact shape (no markdown, no extra text):
{
  "scores": {
    "grammarAccuracy": <integer 0–10>,
    "vocabularyRange": <integer 0–10>,
    "ieltsReadiness": <integer 0–10>,
    "overall": <average to 1 decimal place>
  },
  "errors": [
    {
      "type": "<error category, e.g. Tense Error / Missing Article / Wrong Preposition>",
      "issue": "<what exactly is wrong in the sentence>",
      "hint": "<a helpful hint to fix it WITHOUT giving the corrected form>"
    }
  ],
  "strengths": ["<what is grammatically or lexically good>"],
  "suggestions": ["<improvement tip 1>", "<improvement tip 2>"],
  "levelAssessment": "<one of: Beginner / Elementary / Pre-Intermediate / Intermediate / Upper-Intermediate / Advanced>"
}`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{
      role: 'user',
      content: `Assess this sentence for IELTS academic writing suitability:\n\n"${sentence}"`,
    }],
  });

  const text = response.content[0].text.trim();
  const result = JSON.parse(text);

  // Enforce overall score
  const avg = (result.scores.grammarAccuracy + result.scores.vocabularyRange + result.scores.ieltsReadiness) / 3;
  result.scores.overall = Math.round(avg * 10) / 10;

  return result;
}

module.exports = { assessWriting, checkSentence };

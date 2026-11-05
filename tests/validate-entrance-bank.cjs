const fs = require('node:fs');
const html = fs.readFileSync('index.html', 'utf8');
const match = html.match(/const DB=(\{[\s\S]*?\}),key=/);
if (!match) throw new Error('Could not locate DB JSON');
const db = JSON.parse(match[1]);
if (!Array.isArray(db.topics) || !db.topics.length) throw new Error('DB.topics must be non-empty');
if (!Array.isArray(db.questions) || !db.questions.length) throw new Error('DB.questions must be non-empty');
const topicNames = new Set(db.topics.map(t => t.name));
if (topicNames.size !== db.topics.length) throw new Error('Topic names must be unique');
const counts = new Map([...topicNames].map(name => [name, 0]));
const prompts = new Set();
const formats = {choice:0, tf:0, fill:0};
const answerPositions = [0,0,0,0];
let passageCount = 0, failures = 0;
for (const [index, q] of db.questions.entries()) {
  const where = 'Question #' + (index + 1);
  if (!topicNames.has(q.topic)) { console.error(where + ': unknown topic: ' + q.topic); failures++; }
  else counts.set(q.topic, counts.get(q.topic) + 1);
  if (typeof q.q !== 'string' || !q.q.trim()) { console.error(where + ': missing prompt'); failures++; }
  const normalized = String(q.q || '').replace(/\s+/g, ' ').trim().toLowerCase();
  if (prompts.has(normalized)) { console.error(where + ': duplicate prompt: ' + q.q); failures++; }
  prompts.add(normalized);
  const type = q.type || 'choice';
  if (!(type in formats)) { console.error(where + ': unsupported type ' + type); failures++; }
  else formats[type]++;
  if (type === 'choice') {
    if (!Array.isArray(q.options) || q.options.length !== 4 || q.options.some(v => typeof v !== 'string' || !v.trim())) { console.error(where + ': choice must have four options'); failures++; }
    if (!Number.isInteger(q.a) || !Array.isArray(q.options) || q.a < 0 || q.a >= q.options.length) { console.error(where + ': invalid choice answer index'); failures++; }
    else answerPositions[q.a]++;
  } else if (type === 'tf') {
    if (!Array.isArray(q.options) || q.options.length !== 2 || q.options.some(v => typeof v !== 'string' || !v.trim())) { console.error(where + ': true/false must have two options'); failures++; }
    if (![0,1].includes(q.a)) { console.error(where + ': true/false answer must be 0 or 1'); failures++; }
  } else if (type === 'fill') {
    if (typeof q.answer !== 'string' || !q.answer.trim() || !Array.isArray(q.answers) || !q.answers.length) { console.error(where + ': fill needs an answer and accepted answers'); failures++; }
  }
  if (q.passage) { passageCount++; if (typeof q.passage.title !== 'string' || typeof q.passage.text !== 'string' || q.passage.text.trim().length < 100) { console.error(where + ': passage must contain at least 100 characters'); failures++; } }
  if (typeof q.ex !== 'string' || !q.ex.trim()) { console.error(where + ': missing explanation'); failures++; }
}
for (const topic of db.topics) { const count = counts.get(topic.name) || 0; if (count < 2) { console.error('Topic "' + topic.name + '" has only ' + count + ' questions; minimum is 2'); failures++; } }
if (!formats.tf || !formats.fill) { console.error('Both true/false and fill-in questions are required'); failures++; }
if (passageCount < 6) { console.error('At least six passage-linked questions are required'); failures++; }
const nonzero = answerPositions.filter(n => n > 0);
if (nonzero.length < 3 || Math.max(...answerPositions) - Math.min(...answerPositions) > 1) { console.error('Correct answer positions are not sufficiently balanced: ' + answerPositions.join(',')); failures++; }
console.log('Topics: ' + db.topics.length + '; questions: ' + db.questions.length);
console.log('Formats: ' + JSON.stringify(formats) + '; passage-linked: ' + passageCount);
console.log('Choice answer positions A-D: ' + answerPositions.join(', '));
for (const [name, count] of counts) console.log(' - ' + name + ': ' + count);
if (failures) { console.error('Entrance-bank validation failed with ' + failures + ' issue(s).'); process.exit(1); }
console.log('Entrance-bank structural validation passed.');

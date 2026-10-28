const fs = require('node:fs');
const assert = require('node:assert/strict');

const html = fs.readFileSync('index.html', 'utf8');
const match = html.match(/const DB=(\{[\s\S]*?\}),key=/);
assert.ok(match, 'Could not locate the embedded DB JSON in index.html');
const db = JSON.parse(match[1]);
assert.ok(Array.isArray(db.topics) && db.topics.length > 0, 'DB.topics must be non-empty');
assert.ok(Array.isArray(db.questions) && db.questions.length > 0, 'DB.questions must be non-empty');

const topicNames = new Set(db.topics.map(t => t.name));
assert.equal(topicNames.size, db.topics.length, 'Topic names must be unique');
const counts = new Map([...topicNames].map(name => [name, 0]));
const prompts = new Set();
let failures = 0;

for (const [index, q] of db.questions.entries()) {
  const where = 'Question #' + (index + 1);
  if (!topicNames.has(q.topic)) { console.error(where + ': unknown topic: ' + q.topic); failures++; }
  else counts.set(q.topic, counts.get(q.topic) + 1);
  if (typeof q.q !== 'string' || !q.q.trim()) { console.error(where + ': missing prompt'); failures++; }
  const normalized = String(q.q || '').replace(/\s+/g, ' ').trim().toLowerCase();
  if (prompts.has(normalized)) { console.error(where + ': duplicate prompt: ' + q.q); failures++; }
  prompts.add(normalized);
  if (!Array.isArray(q.options) || q.options.length !== 4 || q.options.some(v => typeof v !== 'string' || !v.trim())) {
    console.error(where + ': expected exactly four non-empty options'); failures++;
  }
  if (!Number.isInteger(q.a) || !Array.isArray(q.options) || q.a < 0 || q.a >= q.options.length) {
    console.error(where + ': answer index is outside the option range'); failures++;
  }
  if (typeof q.ex !== 'string' || !q.ex.trim()) { console.error(where + ': missing explanation'); failures++; }
}
for (const topic of db.topics) {
  const count = counts.get(topic.name) || 0;
  if (count < 2) { console.error('Topic "' + topic.name + '" has only ' + count + ' question(s); minimum is 2'); failures++; }
}
console.log('Topics: ' + db.topics.length + '; questions: ' + db.questions.length);
for (const [name, count] of counts) console.log(' - ' + name + ': ' + count);
if (failures) {
  console.error('Entrance-bank validation failed with ' + failures + ' issue(s).');
  process.exit(1);
}
console.log('Entrance-bank structural validation passed.');

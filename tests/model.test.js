import test from 'node:test';
import assert from 'node:assert/strict';
import { createDocument, createEntry, categories, validateDocument } from '../model.js';

test('초기 기록은 개인정보를 포함하지 않으며 유효한 백업 형식이다', () => {
  const data = createDocument();
  assert.equal(validateDocument(data), true);
  assert.equal(data.entries.length, 5);
  assert.ok(data.entries.every(e => e.fields.every(f => f.value === '')));
});
test('여러 학교와 경력의 ID가 겹치지 않고 백업으로 왕복한다', () => {
  const data = createDocument();
  data.entries.push(createEntry(categories[1]), createEntry(categories[3]));
  data.entries[0].fields[0].value = '<script>alert("개인정보")</script>\n홍길동';
  const restored = JSON.parse(JSON.stringify(data));
  assert.equal(validateDocument(restored), true);
  assert.deepEqual(restored, data);
});
test('손상되거나 지원하지 않는 백업과 중복 ID를 거부한다', () => {
  for (const value of [null, [], {}, {version:2, entries:[]}, {version:1, entries:[null]}]) {
    assert.equal(validateDocument(value), false);
  }
  const data = createDocument();
  data.entries[1].id = data.entries[0].id;
  assert.equal(validateDocument(data), false);
});
test('과도한 크기, 잘못된 분류와 문자열이 아닌 필드를 거부한다', () => {
  for (const mutate of [
    d => { d.entries[0].category = 'unknown'; },
    d => { d.entries[0].fields[0].value = 123; },
    d => { d.entries[0].fields[0].value = 'x'.repeat(10001); },
    d => { d.entries[0].fields[0].label = {}; },
  ]) {
    const data = createDocument(); mutate(data);
    assert.equal(validateDocument(data), false);
  }
});

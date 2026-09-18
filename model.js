export const STORAGE_KEY = 'resumeNote.v1';
export const categories = [
  { id: 'personal', label: '개인정보', fields: ['이름', '영문 이름', '생년월일', '연락처', '이메일', '주소'] },
  { id: 'education', label: '학력', fields: ['학교명', '전공', '입학일', '졸업일', '학위 / 졸업 상태', '학점'] },
  { id: 'military', label: '군 복무', fields: ['병역 사항', '군별 / 병과', '계급', '입대일', '전역일'] },
  { id: 'career', label: '경력', fields: ['회사명', '부서 / 직무', '직급', '입사일', '퇴사일', '주요 업무'] },
  { id: 'other', label: '기타', fields: ['자격증 / 어학', '취득일', '추가 메모'] },
];
export function createEntry(category) {
  return { id: crypto.randomUUID(), category: category.id, title: category.label,
    fields: category.fields.map(label => ({ id: crypto.randomUUID(), label, value: '' })) };
}
export function createDocument() {
  return { version: 1, entries: categories.map(createEntry) };
}
export function validateDocument(value) {
  if (!value || value.version !== 1 || !Array.isArray(value.entries) || value.entries.length > 100) return false;
  const ids = new Set();
  const validId = id => {
    if (typeof id !== 'string' || !id || ids.has(id)) return false;
    ids.add(id); return true;
  };
  const string = (v, limit) => typeof v === 'string' && v.length <= limit;
  return value.entries.every(e => e && validId(e.id) && categories.some(c => c.id === e.category)
    && string(e.title, 100) && Array.isArray(e.fields) && e.fields.length <= 50
    && e.fields.every(f => f && validId(f.id) && string(f.label, 100) && string(f.value, 10000)));
}

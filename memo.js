import { STORAGE_KEY, categories, createEntry, createDocument, validateDocument } from './model.js';
const $ = selector => document.querySelector(selector);
let data;
let selected = 'personal';
let queue = Promise.resolve();
let pending = 0;
function status(message, error = false) {
  $('#status').textContent = message;
  $('#status').classList.toggle('error', error);
}
function save() {
  const snapshot = structuredClone(data);
  pending++;
  status('저장 중…');
  queue = queue.then(async () => {
    try {
      await chrome.storage.local.set({ [STORAGE_KEY]: snapshot });
      status('저장됨 · ' + new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }));
    } catch {
      status('저장 실패 · 백업을 내보내 주세요.', true);
    } finally { pending--; }
  });
}
function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function render() {
  $('#categories').replaceChildren(...categories.map(category => {
    const button = element('button', '', category.label);
    button.setAttribute('aria-pressed', String(category.id === selected));
    button.onclick = () => { selected = category.id; render(); };
    return button;
  }));
  $('#section-title').textContent = categories.find(c => c.id === selected).label;
  const entries = data.entries.filter(entry => entry.category === selected);
  $('#entries').replaceChildren(...entries.map(entry => {
    const article = element('article');
    const head = element('div', 'entry-head');
    const title = element('input');
    title.value = entry.title;
    title.maxLength = 100;
    title.setAttribute('aria-label', '기록 제목');
    title.dataset.id = entry.id;
    title.oninput = () => { entry.title = title.value; save(); };
    const remove = element('button', 'delete', '삭제');
    remove.onclick = () => {
      if (!confirm(`“${entry.title}” 기록을 삭제할까요?`)) return;
      data.entries = data.entries.filter(item => item.id !== entry.id);
      save(); render();
    };
    head.append(title, remove); article.append(head);
    entry.fields.forEach(field => {
      const wrapper = element('div', 'field');
      const top = element('div', 'field-top');
      const label = element('label', '', field.label);
      const input = element('textarea');
      input.id = `field-${field.id}`;
      input.dataset.id = field.id;
      label.htmlFor = input.id;
      input.value = field.value;
      input.rows = field.value.includes('\n') ? 3 : 1;
      input.maxLength = 10000;
      input.placeholder = /일$/.test(field.label) ? '예: 2020.03.02 · 확인한 날짜를 입력' : `${field.label} 입력`;
      const copy = element('button', 'copy', '복사');
      copy.setAttribute('aria-label', `${field.label} 복사`);
      copy.disabled = !field.value;
      input.oninput = () => { field.value = input.value; copy.disabled = !field.value; save(); };
      copy.onclick = async () => {
        try {
          await navigator.clipboard.writeText(field.value);
          status(`${field.label} 복사됨`);
        } catch {
          input.focus(); input.select();
          status('복사할 값 선택됨 · Ctrl+C / ⌘C를 눌러 주세요.', true);
        }
      };
      top.append(label, copy); wrapper.append(top, input); article.append(wrapper);
    });
    return article;
  }));
  if (!entries.length) $('#entries').append(element('p', 'empty', '아직 기록이 없어요.\n기록 추가로 첫 메모를 남겨 보세요.'));
}
$('#add-entry').onclick = () => {
  if (data.entries.length >= 100) { status('기록은 최대 100개까지 저장할 수 있습니다.', true); return; }
  const entry = createEntry(categories.find(c => c.id === selected));
  data.entries.push(entry); save(); render();
  const inputs = document.querySelectorAll('.entry-head input');
  inputs[inputs.length - 1].focus();
};
$('#compact').onclick = () => {
  const compact = document.body.classList.toggle('compact');
  $('#compact').textContent = compact ? '펼치기' : '접기';
  $('#compact').setAttribute('aria-expanded', String(!compact));
  $('#compact').title = compact ? '메모 내용 펼치기' : '메모 내용 접기';
};
$('#export').onclick = () => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = element('a');
  anchor.href = url;
  anchor.download = `이력메모-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  status('백업 파일 내보냄');
};
$('#import').onclick = () => $('#file').click();
$('#file').onchange = async event => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    if (file.size > 5 * 1024 * 1024) throw new Error('size');
    const imported = JSON.parse(await file.text());
    if (!validateDocument(imported)) throw new Error('format');
    if (!confirm('현재 모든 기록을 백업 파일의 내용으로 교체할까요?')) return;
    data = imported; save(); render();
  } catch { status('가져오기 실패 · 올바른 백업 JSON(5MB 이하)을 선택하세요.', true); }
  finally { event.target.value = ''; }
};
// Refresh values from other open memo panels without losing caret position.
chrome.storage.onChanged.addListener((changes, area) => {
  const next = changes[STORAGE_KEY]?.newValue;
  if (area !== 'local' || pending || !validateDocument(next)) return;
  const active = document.activeElement;
  const focusId = active?.dataset?.id;
  const start = active?.selectionStart;
  const end = active?.selectionEnd;
  data = next; render();
  if (focusId) {
    const target = [...document.querySelectorAll('[data-id]')].find(el => el.dataset.id === focusId);
    if (target) { target.focus(); target.setSelectionRange(start, end); }
  }
  status('다른 창의 변경 사항 반영됨');
});
try {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  if (stored[STORAGE_KEY] !== undefined && !validateDocument(stored[STORAGE_KEY])) throw new Error('invalid');
  data = stored[STORAGE_KEY] ?? createDocument();
  render(); status('자동 저장 준비됨');
} catch {
  document.querySelectorAll('button').forEach(button => { button.disabled = true; });
  status('메모를 불러오지 못했습니다. 확장 프로그램을 다시 열어 주세요.', true);
}

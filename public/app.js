/* ============================================================
   Tab navigation
   ============================================================ */
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-selected', 'false');
    });
    document.querySelectorAll('.tab-panel').forEach(p => {
      p.classList.remove('active');
      p.hidden = true;
    });
    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');
    const panel = document.getElementById('tab-' + btn.dataset.tab);
    panel.classList.add('active');
    panel.hidden = false;
  });
});

/* ============================================================
   Teacher panel toggle
   ============================================================ */
const teacherToggle = document.getElementById('teacher-toggle');
const teacherBody   = document.getElementById('teacher-body');
const chevron       = document.getElementById('teacher-chevron');

teacherToggle.addEventListener('click', () => {
  const isOpen = !teacherBody.hidden;
  teacherBody.hidden = isOpen;
  chevron.classList.toggle('open', !isOpen);
  teacherToggle.setAttribute('aria-expanded', String(!isOpen));
});

/* Restore saved teacher settings */
const els = {
  taskType:    document.getElementById('task-type'),
  question:    document.getElementById('question-input'),
  modelAnswer: document.getElementById('model-answer-input'),
};

const saved = {
  taskType:    localStorage.getItem('ielts_task_type'),
  question:    localStorage.getItem('ielts_question'),
  modelAnswer: localStorage.getItem('ielts_model_answer'),
};

if (saved.taskType)    els.taskType.value    = saved.taskType;
if (saved.question)    els.question.value    = saved.question;
if (saved.modelAnswer) els.modelAnswer.value = saved.modelAnswer;

applyTeacherSettings();

document.getElementById('save-settings-btn').addEventListener('click', () => {
  localStorage.setItem('ielts_task_type',    els.taskType.value);
  localStorage.setItem('ielts_question',     els.question.value.trim());
  localStorage.setItem('ielts_model_answer', els.modelAnswer.value.trim());
  applyTeacherSettings();
  teacherBody.hidden = true;
  chevron.classList.remove('open');
  teacherToggle.setAttribute('aria-expanded', 'false');
});

els.taskType.addEventListener('change', () => {
  document.getElementById('task-badge').textContent =
    els.taskType.value === 'task1' ? 'Task 1' : 'Task 2';
});

function applyTeacherSettings() {
  const q = els.question.value.trim();
  document.getElementById('task-badge').textContent =
    els.taskType.value === 'task1' ? 'Task 1' : 'Task 2';

  const qDisplay = document.getElementById('question-display');
  if (q) {
    document.getElementById('question-text').textContent = q;
    qDisplay.hidden = false;
  } else {
    qDisplay.hidden = true;
  }
}

/* ============================================================
   Word count
   ============================================================ */
const writingInput = document.getElementById('writing-input');
writingInput.addEventListener('input', updateWordCount);

function updateWordCount() {
  const words = writingInput.value.trim().split(/\s+/).filter(Boolean);
  document.getElementById('word-count').textContent = words.length;
}

/* ============================================================
   File upload
   ============================================================ */
document.getElementById('file-upload').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    writingInput.value = ev.target.result;
    updateWordCount();
  };
  reader.readAsText(file);
  e.target.value = ''; // allow re-uploading same file
});

/* ============================================================
   Writing assessment
   ============================================================ */
document.getElementById('assess-btn').addEventListener('click', async () => {
  const writingText = writingInput.value.trim();
  const wordCount   = writingText.split(/\s+/).filter(Boolean).length;

  hideError('assess-error');

  if (wordCount < 10) {
    showError('assess-error', 'Please write at least 10 words before submitting.');
    return;
  }

  const btn = document.getElementById('assess-btn');
  setLoading(btn, 'Assessing…');

  try {
    const res = await fetch('/api/assess', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        taskType:    els.taskType.value,
        question:    els.question.value.trim(),
        writingText,
        modelAnswer: els.modelAnswer.value.trim(),
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Assessment failed.');

    renderWritingResults(data);
    document.getElementById('writing-results').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (err) {
    showError('assess-error', err.message);
  } finally {
    clearLoading(btn, 'Assess My Writing');
  }
});

function renderWritingResults(data) {
  const taskType = els.taskType.value;
  const isTask1  = taskType === 'task1';
  const firstKey  = isTask1 ? 'taskAchievement' : 'taskResponse';
  const firstName = isTask1 ? 'Task Achievement' : 'Task Response';

  const results = document.getElementById('writing-results');
  results.hidden = false;

  /* Band circle */
  const overall = data.scores.overall;
  document.getElementById('band-number').textContent = overall;
  const circle = document.getElementById('band-circle');
  if (overall >= 7)      circle.style.background = 'linear-gradient(135deg, #065f46, #059669)';
  else if (overall >= 5) circle.style.background = 'linear-gradient(135deg, #78350f, #d97706)';
  else                   circle.style.background = 'linear-gradient(135deg, #1e429f, #1a56db)';

  /* Score bars */
  const criteria = [
    { key: firstKey, name: firstName },
    { key: 'coherenceCohesion',         name: 'Coherence & Cohesion' },
    { key: 'lexicalResource',           name: 'Lexical Resource' },
    { key: 'grammaticalRangeAccuracy',  name: 'Grammatical Range & Accuracy' },
  ];

  document.getElementById('score-bars').innerHTML = criteria.map(({ key, name }) => {
    const score = data.scores[key];
    const pct   = (score / 9) * 100;
    return `
      <div class="bar-item">
        <div class="bar-header">
          <span class="bar-name">${name}</span>
          <span class="bar-value">Band ${score}</span>
        </div>
        <div class="bar-track">
          <div class="bar-fill" style="width:${pct}%"></div>
        </div>
      </div>`;
  }).join('');

  /* Criterion feedback */
  document.getElementById('criterion-feedback').innerHTML = criteria.map(({ key, name }) => {
    const score = data.scores[key];
    const cls   = score >= 7 ? 'score-high' : score >= 5 ? 'score-mid' : 'score-low';
    return `
      <div class="feedback-item">
        <div class="feedback-item-header">
          <span class="feedback-item-name">${name}</span>
          <span class="feedback-score ${cls}">Band ${score}</span>
        </div>
        <p>${escHtml(data.feedback[key] || '')}</p>
      </div>`;
  }).join('');

  /* Strengths & improvements */
  document.getElementById('strengths-list').innerHTML =
    (data.strengths || []).map(s => `<li>${escHtml(s)}</li>`).join('');

  document.getElementById('improve-list').innerHTML =
    (data.improvements || []).map(i => `<li>${escHtml(i)}</li>`).join('');

  /* Model answer / encouragement */
  const modelCard   = document.getElementById('model-answer-card');
  const encourageCard = document.getElementById('encouragement-card');

  if (data.modelAnswer) {
    document.getElementById('model-answer-body').textContent = data.modelAnswer;
    modelCard.hidden   = false;
    encourageCard.hidden = true;
  } else {
    modelCard.hidden   = true;
    encourageCard.hidden = false;
  }
}

/* ============================================================
   Sentence checker
   ============================================================ */
document.getElementById('check-btn').addEventListener('click', async () => {
  const sentence = document.getElementById('sentence-input').value.trim();

  hideError('sentence-error');

  if (sentence.length < 5) {
    showError('sentence-error', 'Please enter a sentence to check.');
    return;
  }

  const btn = document.getElementById('check-btn');
  setLoading(btn, 'Checking…');

  try {
    const res = await fetch('/api/sentence', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sentence }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Check failed.');

    renderSentenceResults(data);
    document.getElementById('sentence-results').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (err) {
    showError('sentence-error', err.message);
  } finally {
    clearLoading(btn, 'Check Sentence');
  }
});

function renderSentenceResults(data) {
  const results = document.getElementById('sentence-results');
  results.hidden = false;

  /* Score grid */
  const scoreItems = [
    { key: 'grammarAccuracy',  label: 'Grammar Accuracy' },
    { key: 'vocabularyRange',  label: 'Vocabulary Range' },
    { key: 'ieltsReadiness',   label: 'IELTS Readiness' },
  ];

  document.getElementById('sentence-score-grid').innerHTML = scoreItems.map(({ key, label }) => {
    const score = data.scores[key];
    const color = score >= 7 ? 'var(--green)' : score >= 5 ? 'var(--amber)' : 'var(--red)';
    return `
      <div class="sc-score-card">
        <span class="sc-score-label">${label}</span>
        <span class="sc-score-num" style="color:${color}">${score}</span>
        <span class="sc-score-denom">/ 10</span>
      </div>`;
  }).join('');

  /* Level badge — remove any previous before adding */
  const badgeWrap = document.getElementById('level-badge-wrap');
  badgeWrap.innerHTML = '';
  if (data.levelAssessment) {
    badgeWrap.innerHTML =
      `<span class="level-badge">📊 Level: ${escHtml(data.levelAssessment)}</span>`;
  }

  /* Errors */
  const errorListEl = document.getElementById('error-list');
  if (data.errors && data.errors.length > 0) {
    errorListEl.innerHTML = data.errors.map(e => `
      <div class="error-item">
        <div class="error-type">${escHtml(e.type)}</div>
        <div class="error-issue">${escHtml(e.issue)}</div>
        <div class="error-hint">${escHtml(e.hint)}</div>
      </div>`).join('');
  } else {
    errorListEl.innerHTML = '<p class="no-errors">✓ No errors found!</p>';
  }

  /* Suggestions */
  document.getElementById('sentence-suggestions').innerHTML =
    (data.suggestions || []).map(s => `<li>${escHtml(s)}</li>`).join('');

  /* Strengths */
  document.getElementById('sentence-strengths').innerHTML =
    (data.strengths || []).map(s => `<li>${escHtml(s)}</li>`).join('');
}

/* ============================================================
   Nutrition Tracker
   ============================================================ */

/* ── Daily log (localStorage) ─────────────────────────────── */

const LOG_KEY = 'nutrition_daily_log';

function todayStr() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function loadDailyLog() {
  try {
    const raw = localStorage.getItem(LOG_KEY);
    if (!raw) return { date: todayStr(), items: [] };
    const log = JSON.parse(raw);
    if (log.date !== todayStr()) return { date: todayStr(), items: [] }; // reset for new day
    return log;
  } catch {
    return { date: todayStr(), items: [] };
  }
}

function saveDailyLog(log) {
  localStorage.setItem(LOG_KEY, JSON.stringify(log));
}

/* ── Macro totals display ──────────────────────────────────── */

function updateMacroTotals() {
  const log = loadDailyLog();
  const totals = log.items.reduce((acc, item) => {
    acc.calories += item.calories || 0;
    acc.protein  += item.protein  || 0;
    acc.carbs    += item.carbs    || 0;
    acc.fat      += item.fat      || 0;
    return acc;
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

  document.getElementById('total-calories').textContent = Math.round(totals.calories);
  document.getElementById('total-protein').textContent  = totals.protein.toFixed(1);
  document.getElementById('total-carbs').textContent    = totals.carbs.toFixed(1);
  document.getElementById('total-fat').textContent      = totals.fat.toFixed(1);
}

/* ── Log list rendering ───────────────────────────────────── */

function renderLogList() {
  const log = loadDailyLog();
  const container = document.getElementById('daily-log-list');
  if (log.items.length === 0) {
    container.innerHTML = '<p class="empty-log">No items logged yet. Scan a label to get started.</p>';
    return;
  }
  container.innerHTML = log.items.map(item => `
    <div class="log-item" data-id="${escHtml(item.id)}">
      <div class="log-item-info">
        <span class="log-item-name">${escHtml(item.productName)}</span>
        <span class="log-item-serving">${escHtml(item.servingDesc)}</span>
      </div>
      <div class="log-item-macros">
        <span class="log-macro log-cal">${Math.round(item.calories)} kcal</span>
        <span class="log-macro log-p">P: ${item.protein.toFixed(1)}g</span>
        <span class="log-macro log-c">C: ${item.carbs.toFixed(1)}g</span>
        <span class="log-macro log-f">F: ${item.fat.toFixed(1)}g</span>
      </div>
      <button class="log-remove-btn" data-id="${escHtml(item.id)}" aria-label="Remove item">✕</button>
    </div>`).join('');

  container.querySelectorAll('.log-remove-btn').forEach(btn => {
    btn.addEventListener('click', () => removeLogItem(btn.dataset.id));
  });
}

function removeLogItem(id) {
  const log = loadDailyLog();
  log.items = log.items.filter(i => i.id !== id);
  saveDailyLog(log);
  updateMacroTotals();
  renderLogList();
}

/* ── Image handling ───────────────────────────────────────── */

let _scannedData = null;

function compressImage(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => {
        const MAX = 1600;
        let w = img.width;
        let h = img.height;
        if (w > MAX || h > MAX) {
          const ratio = Math.min(MAX / w, MAX / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width  = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        const base64 = dataUrl.split(',')[1];
        resolve({ base64, mimeType: 'image/jpeg' });
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function showImagePreview(file) {
  const url = URL.createObjectURL(file);
  document.getElementById('scan-preview').src = url;
  document.getElementById('scan-placeholder').hidden = true;
  document.getElementById('scan-preview-wrap').hidden = false;
}

/* ── Scanning ─────────────────────────────────────────────── */

async function handleImageSelected(file) {
  if (!file) return;
  hideError('nutrition-error');
  document.getElementById('scan-result').hidden = true;

  showImagePreview(file);

  const scanBtn = document.getElementById('add-to-log-btn');
  const zone = document.getElementById('scan-zone');
  zone.classList.add('scan-loading');

  try {
    const { base64, mimeType } = await compressImage(file);

    const res = await fetch('/api/nutrition/scan', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64, mimeType }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Scan failed.');

    _scannedData = data;
    renderScanResult(data);
    document.getElementById('scan-result').hidden = false;
    document.getElementById('scan-result').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch (err) {
    showError('nutrition-error', err.message);
  } finally {
    zone.classList.remove('scan-loading');
  }
}

function renderScanResult(data) {
  document.getElementById('result-product-name').textContent = data.productName || 'Unknown Product';
  const origEl = document.getElementById('result-original-name');
  if (data.originalName) {
    origEl.textContent = data.originalName;
    origEl.hidden = false;
  } else {
    origEl.hidden = true;
  }

  const servingParts = [data.servingSize];
  if (data.servingsPerPackage) servingParts.push(`${data.servingsPerPackage} servings per package`);
  document.getElementById('result-serving-info').textContent = servingParts.join(' · ');

  const badge = document.getElementById('confidence-badge');
  badge.textContent = data.confidence ? data.confidence.toUpperCase() : '';
  badge.className = 'confidence-badge confidence-' + (data.confidence || 'low');

  const p = data.perServing || {};
  const nfRows = [
    { label: 'Calories',           value: p.calories,          unit: 'kcal', bold: true },
    { label: 'Protein',            value: p.protein,           unit: 'g' },
    { label: 'Total Carbohydrate', value: p.totalCarbohydrate, unit: 'g' },
    { label: '— Sugar',            value: p.sugar,             unit: 'g', sub: true },
    { label: '— Dietary Fiber',    value: p.dietaryFiber,      unit: 'g', sub: true },
    { label: 'Total Fat',          value: p.totalFat,          unit: 'g' },
    { label: '— Saturated Fat',    value: p.saturatedFat,      unit: 'g', sub: true },
    { label: '— Trans Fat',        value: p.transFat,          unit: 'g', sub: true },
    { label: 'Sodium',             value: p.sodium,            unit: 'mg' },
  ].filter(r => r.value != null);

  document.getElementById('nf-rows').innerHTML = nfRows.map(r => `
    <div class="nf-row${r.sub ? ' nf-sub' : ''}${r.bold ? ' nf-bold' : ''}">
      <span>${escHtml(r.label)}</span>
      <span>${r.value}${escHtml(r.unit)}</span>
    </div>`).join('');

  document.getElementById('serving-count').textContent = '1';
}

document.getElementById('label-image').addEventListener('change', e => {
  const file = e.target.files[0];
  e.target.value = '';
  if (file) handleImageSelected(file);
});

document.getElementById('label-image-retry').addEventListener('change', e => {
  const file = e.target.files[0];
  e.target.value = '';
  if (file) handleImageSelected(file);
});

/* ── Serving count controls ───────────────────────────────── */

let _servings = 1;

document.getElementById('serving-minus').addEventListener('click', () => {
  if (_servings > 0.5) {
    _servings = Math.round((_servings - 0.5) * 10) / 10;
    document.getElementById('serving-count').textContent = _servings;
  }
});

document.getElementById('serving-plus').addEventListener('click', () => {
  _servings = Math.round((_servings + 0.5) * 10) / 10;
  document.getElementById('serving-count').textContent = _servings;
});

/* ── Add to log ───────────────────────────────────────────── */

document.getElementById('add-to-log-btn').addEventListener('click', () => {
  if (!_scannedData) return;

  const p = _scannedData.perServing || {};
  const s = _servings;
  const servingDesc = s === 1
    ? _scannedData.servingSize || '1 serving'
    : `${s} × ${_scannedData.servingSize || 'serving'}`;

  const item = {
    id:          Date.now().toString(36) + Math.random().toString(36).slice(2),
    timestamp:   new Date().toISOString(),
    productName: _scannedData.productName || 'Unknown',
    servingDesc,
    calories: (p.calories          || 0) * s,
    protein:  (p.protein           || 0) * s,
    carbs:    (p.totalCarbohydrate || 0) * s,
    fat:      (p.totalFat          || 0) * s,
  };

  const log = loadDailyLog();
  log.items.push(item);
  saveDailyLog(log);

  updateMacroTotals();
  renderLogList();

  // reset scanner UI
  _scannedData = null;
  _servings = 1;
  document.getElementById('scan-result').hidden = true;
  document.getElementById('scan-placeholder').hidden = false;
  document.getElementById('scan-preview-wrap').hidden = true;
  hideError('nutrition-error');
});

/* ── Clear day ────────────────────────────────────────────── */

document.getElementById('clear-log-btn').addEventListener('click', () => {
  if (!confirm('Clear all items from today\'s log?')) return;
  saveDailyLog({ date: todayStr(), items: [] });
  updateMacroTotals();
  renderLogList();
});

/* ── Init on load ─────────────────────────────────────────── */

document.getElementById('today-date').textContent = new Date().toLocaleDateString('en-US', {
  weekday: 'short', month: 'short', day: 'numeric',
});

updateMacroTotals();
renderLogList();

/* ============================================================
   Helpers
   ============================================================ */
function setLoading(btn, text) {
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span>${text}`;
}

function clearLoading(btn, text) {
  btn.disabled = false;
  btn.textContent = text;
}

function showError(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.hidden = false;
}

function hideError(id) {
  const el = document.getElementById(id);
  if (el) el.hidden = true;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

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

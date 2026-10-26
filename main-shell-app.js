(() => {
  const legacyRoot = document.querySelector('.academy-hub');
  const legacy = legacyRoot && legacyRoot.__MATH_LEGACY;
  const root = document.body;
  if (!root || !legacy) return;

  const DB = legacy.DB;
  const topics = Array.isArray(DB.topics) ? DB.topics : [];
  const questions = Array.isArray(DB.questions) ? DB.questions : [];
  const $ = selector => root.querySelector(selector);
  const $$ = selector => Array.from(root.querySelectorAll(selector));
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
  const state = () => legacy.getState();
  const pages = $$('section.page[id^="page-"]');

  function updateCounters() {
    const current = state();
    const count = $('#reviewCount');
    if (count) count.textContent = String(current.review.length);
    const answered = $('#statAnswered');
    if (answered) answered.textContent = String(current.answered);
    const questionCount = $('#statQuestions');
    if (questionCount) questionCount.textContent = questions.length + '問';
    const homeStats = $$('#page-home .stat strong');
    if (homeStats[0]) homeStats[0].textContent = topics.length + '分野';
  }

  function showPage(name) {
    const target = $('#page-' + name);
    if (!target) return;
    pages.forEach(page => page.classList.toggle('active', page === target));
    $$('.navbtn[data-page]').forEach(button => button.classList.toggle('active', button.dataset.page === name));
    if (name === 'units') renderUnits();
    if (name === 'formulas') renderFormulas();
    if (name === 'review') renderReview();
    if (name === 'progress') renderProgress();
    updateCounters();
    if (window.matchMedia('(max-width: 900px)').matches) {
      const sidebar = $('#sidebar');
      if (sidebar) sidebar.classList.remove('open');
    }
  }

  $$('[data-page]').forEach(button => button.addEventListener('click', () => showPage(button.dataset.page)));
  $$('[data-go]').forEach(button => button.addEventListener('click', () => showPage(button.dataset.go)));
  const menuToggle = $('#menuToggle');
  if (menuToggle) menuToggle.addEventListener('click', () => {
    const sidebar = $('#sidebar');
    if (sidebar) sidebar.classList.toggle('open');
  });

  function cardMarkup(topic, buttonLabel) {
    return '<article class="card"><h3>' + esc(topic.name) + '</h3><p>' + esc(topic.summary) +
      '</p><button class="btn light" type="button" data-unit-name="' + esc(topic.name) + '">' +
      esc(buttonLabel || 'この分野を見る') + '</button></article>';
  }

  function showUnit(name) {
    const topic = topics.find(item => item.name === name);
    const detail = $('#unitDetail');
    if (!topic || !detail) return;
    detail.innerHTML = '<article class="card"><h2>' + esc(topic.name) + '</h2><p>' + esc(topic.summary) +
      '</p>' + (topic.formula ? '<h3>公式・要点</h3><p>' + esc(topic.formula) + '</p>' : '') +
      (topic.condition ? '<h3>使う条件・注意点</h3><p>' + esc(topic.condition) + '</p>' : '') +
      (topic.example ? '<h3>例</h3><p>' + esc(topic.example) + '</p>' : '') +
      '<button class="btn" type="button" id="unitStartQuiz">この分野の問題を解く</button></article>';
    $('#unitStartQuiz').addEventListener('click', () => {
      const select = $('#quizTopic');
      if (select) select.value = topic.name;
      showPage('quiz');
      startQuiz();
    });
  }

  function renderHomeUnits() {
    const container = $('#homeUnits');
    if (!container) return;
    container.innerHTML = topics.map(topic => cardMarkup(topic, 'この分野を学ぶ')).join('');
    container.querySelectorAll('[data-unit-name]').forEach(button => button.addEventListener('click', () => {
      showPage('units');
      showUnit(button.dataset.unitName);
    }));
  }

  function renderUnits() {
    const grid = $('#unitGrid');
    if (!grid) return;
    const query = ($('#unitSearch') && $('#unitSearch').value || '').trim().toLocaleLowerCase();
    const filtered = topics.filter(topic => (topic.name + ' ' + topic.summary).toLocaleLowerCase().includes(query));
    grid.innerHTML = filtered.length ? filtered.map(topic => cardMarkup(topic, '内容を見る')).join('') :
      '<p class="empty">該当する分野がありません。検索語を変えてください。</p>';
    grid.querySelectorAll('[data-unit-name]').forEach(button => button.addEventListener('click', () => showUnit(button.dataset.unitName)));
  }

  function renderFormulas() {
    const list = $('#formulaList');
    const filter = $('#formulaFilter');
    if (!list) return;
    const query = ($('#formulaSearch') && $('#formulaSearch').value || '').trim().toLocaleLowerCase();
    const selected = filter ? filter.value : 'all';
    const filtered = topics.filter(topic => (selected === 'all' || topic.name === selected) &&
      (topic.name + ' ' + topic.summary + ' ' + (topic.formula || '') + ' ' + (topic.condition || '') + ' ' + (topic.example || '')).toLocaleLowerCase().includes(query));
    list.innerHTML = filtered.length ? filtered.map(topic =>
      '<article class="card"><h3>' + esc(topic.name) + '</h3><p>' + esc(topic.summary) + '</p>' +
      (topic.formula ? '<h4>公式・要点</h4><p>' + esc(topic.formula) + '</p>' : '') +
      (topic.condition ? '<h4>使う条件・注意点</h4><p>' + esc(topic.condition) + '</p>' : '') +
      (topic.example ? '<h4>例</h4><p>' + esc(topic.example) + '</p>' : '') + '</article>'
    ).join('') : '<p class="empty">該当する公式・解法がありません。</p>';
  }

  function runQuestions(container, items, label) {
    if (!container) return;
    if (!items.length) {
      container.innerHTML = '<p class="empty">この条件に合う問題はまだありません。</p>';
      return;
    }
    let index = 0;
    function next() {
      if (index >= items.length) {
        container.innerHTML = '<div class="card"><h3>' + esc(label) + ' 完了</h3><p>最後まで解きました。解答結果は学習記録に反映されています。</p><button class="btn" id="restartQuestionFlow" type="button">もう一度挑戦</button></div>';
        $('#restartQuestionFlow').addEventListener('click', () => runQuestions(container, items, label));
        renderProgress();
        updateCounters();
        return;
      }
      const question = items[index++];
      legacy.ask(container, question, () => {
        renderProgress();
        updateCounters();
        next();
      }, label + ' ' + index + '/' + items.length);
    }
    next();
  }

  function startQuiz() {
    const topic = $('#quizTopic') ? $('#quizTopic').value : 'all';
    const count = Math.max(1, Number($('#quizCount') && $('#quizCount').value) || 10);
    const filtered = questions.filter(question => topic === 'all' || question.topic === topic);
    runQuestions($('#quizCard'), filtered.slice(0, count), '一問一答');
  }

  function startPractice() {
    const count = Math.max(1, Number($('#practiceCount') && $('#practiceCount').value) || 10);
    const items = questions.slice(0, count);
    runQuestions($('#practiceCard'), items, '共通入試演習');
  }

  function startMock() {
    const count = Math.max(1, Number($('#mockCount') && $('#mockCount').value) || 10);
    const items = questions.slice().sort(() => Math.random() - 0.5).slice(0, count);
    runQuestions($('#mockCard'), items, '総合模擬試験');
  }

  function renderReview() {
    const container = $('#reviewList');
    if (!container) return;
    const saved = state().review;
    if (!saved.length) {
      container.innerHTML = '<p class="empty">復習リストは空です。問題を間違えると自動で追加されます。</p>';
      updateCounters();
      return;
    }
    container.innerHTML = saved.map((text, index) => {
      const question = questions.find(item => item.q === text);
      return '<article class="card"><p>' + esc(text) + '</p>' +
        (question ? '<button class="btn" type="button" data-review-q="' + index + '">もう一度解く</button>' : '') +
        '<button class="btn outline" type="button" data-review-remove="' + index + '">リストから外す</button></article>';
    }).join('');
    container.querySelectorAll('[data-review-q]').forEach(button => button.addEventListener('click', () => {
      const question = questions.find(item => item.q === saved[Number(button.dataset.reviewQ)]);
      if (question) runQuestions(container, [question], '復習問題');
    }));
    container.querySelectorAll('[data-review-remove]').forEach(button => button.addEventListener('click', () => {
      const index = Number(button.dataset.reviewRemove);
      state().review.splice(index, 1);
      legacy.save();
      renderReview();
      updateCounters();
    }));
    updateCounters();
  }

  function renderProgress() {
    const current = state();
    if ($('#pAnswered')) $('#pAnswered').textContent = String(current.answered);
    if ($('#pCorrect')) $('#pCorrect').textContent = String(current.correct);
    if ($('#pRate')) $('#pRate').textContent = current.answered ? Math.round(current.correct / current.answered * 100) + '%' : '0%';
    const stats = $('#topicStats');
    if (stats) {
      const entries = Object.entries(current.stats);
      stats.innerHTML = entries.length ? entries.map(([name, value]) => {
        const rate = value.total ? Math.round(value.correct / value.total * 100) : 0;
        return '<article class="card"><strong>' + esc(name) + '</strong><p>' + value.correct + '/' + value.total + '問（' + rate + '%）</p></article>';
      }).join('') : '<p class="empty">まだ学習記録がありません。問題を解くとここに表示されます。</p>';
    }
    updateCounters();
  }

  const unitSearch = $('#unitSearch');
  if (unitSearch) unitSearch.addEventListener('input', renderUnits);
  const formulaSearch = $('#formulaSearch');
  if (formulaSearch) formulaSearch.addEventListener('input', renderFormulas);
  const formulaFilter = $('#formulaFilter');
  if (formulaFilter) topics.forEach(topic => {
    const option = document.createElement('option');
    option.value = topic.name;
    option.textContent = topic.name;
    formulaFilter.appendChild(option);
  });
  if (formulaFilter) formulaFilter.addEventListener('change', renderFormulas);
  const quizTopic = $('#quizTopic');
  if (quizTopic) topics.forEach(topic => {
    const option = document.createElement('option');
    option.value = topic.name;
    option.textContent = topic.name;
    quizTopic.appendChild(option);
  });

  if ($('#quizStart')) $('#quizStart').addEventListener('click', startQuiz);
  if ($('#practiceStart')) $('#practiceStart').addEventListener('click', startPractice);
  if ($('#mockStart')) $('#mockStart').addEventListener('click', startMock);
  if ($('#clearReview')) $('#clearReview').addEventListener('click', () => {
    state().review = [];
    legacy.save();
    renderReview();
    updateCounters();
  });
  if ($('#resetStats')) $('#resetStats').addEventListener('click', () => {
    if (window.confirm('学習記録をリセットしますか？')) {
      legacy.reset();
      renderProgress();
      renderReview();
      updateCounters();
    }
  });
  if ($('#runSelfTest')) $('#runSelfTest').addEventListener('click', () => {
    const errors = [];
    if (!topics.length) errors.push('学習分野データがありません');
    if (!questions.length) errors.push('問題データがありません');
    questions.forEach((question, index) => {
      if (!Array.isArray(question.options) || question.options.length < 2) errors.push('問題 ' + (index + 1) + ' の選択肢が不足しています');
      if (!Number.isInteger(question.a) || question.a < 0 || question.a >= question.options.length) errors.push('問題 ' + (index + 1) + ' の正解番号が不正です');
    });
    const results = $('#selfTestResults');
    if (results) results.innerHTML = errors.length ?
      '<p class="error">確認が必要です：</p><ul>' + errors.map(error => '<li>' + esc(error) + '</li>').join('') + '</ul>' :
      '<p class="success">OK：' + topics.length + '分野・' + questions.length + '問を確認しました。選択肢と正解番号に問題はありません。</p>';
  });

  const officialLink = $('#officialLink');
  if (officialLink) officialLink.addEventListener('click', () => {
    const card = $('#practiceCard');
    if (card) card.innerHTML = '<p class="empty">県別の専用問題・公式リンクはまだ登録されていません。現在は共通問題を出題します。</p>';
  });

  const prefSelect = $('#prefSelect');
  if (prefSelect && !prefSelect.options.length) {
    const option = document.createElement('option');
    option.value = 'common';
    option.textContent = '共通問題（県別問題データ未登録）';
    prefSelect.appendChild(option);
  }
  const quizLead = $('#page-quiz .lead');
  if (quizLead) quizLead.textContent += ' 現在の問題データは難易度タグ未設定のため、選択範囲内の問題から出題します。';
  const practiceLead = $('#page-practice .lead');
  if (practiceLead) practiceLead.textContent = '県別の専用問題データは未登録のため、現状は共通問題から出題します。';

  renderHomeUnits();
  renderUnits();
  renderFormulas();
  renderReview();
  renderProgress();
  updateCounters();
})();

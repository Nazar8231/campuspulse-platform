const sidebarNav = document.getElementById('sidebar-nav');
const workspaceContent = document.getElementById('workspace-content');
const profileNameEl = document.getElementById('profile-name');
const profileMetaEl = document.getElementById('profile-meta');
const sidebarRoleEl = document.getElementById('sidebar-role');
const pageEyebrowEl = document.getElementById('page-eyebrow');
const pageTitleEl = document.getElementById('page-title');
const pageSubtitleEl = document.getElementById('page-subtitle');
const rolePillEl = document.getElementById('role-pill');
const clockPillEl = document.getElementById('clock-pill');
const logoutBtn = document.getElementById('logout-btn');
const toastEl = document.getElementById('toast');
const modalRoot = document.getElementById('modal-root');

const state = {
  user: null,
  profileStats: null,
  role: null,
  tabs: [],
  activeTab: null,
  checkins: [],
  studentStats: null,
  insights: null,
  tests: [],
  myResults: [],
  resources: [],
  overview: null,
  allResults: [],
  users: [],
  system: null,
  filters: {
    resultsQuery: ''
  }
};

const ROLE_LABELS = {
  student: 'Студент',
  teacher: 'Викладач',
  admin: 'Адміністратор'
};

const TAB_CONFIG = {
  student: [
    { id: 'overview', label: 'Огляд', subtitle: 'Індекс стану, активність, рекомендації та останні результати.' },
    { id: 'checkin', label: 'Щоденник', subtitle: 'Новий запис про настрій, енергію, сон, стрес і навантаження.' },
    { id: 'journal', label: 'Журнал', subtitle: 'Усі записи самопочуття з можливістю видалення.' },
    { id: 'tests', label: 'Тести', subtitle: 'Активні тести, які можна пройти прямо зараз.' },
    { id: 'results', label: 'Результати', subtitle: 'Історія проходжень тестів та автоматична інтерпретація.' },
    { id: 'resources', label: 'Матеріали', subtitle: 'Практичні поради та короткі матеріали для відновлення.' },
    { id: 'profile', label: 'Профіль', subtitle: 'Особисті дані та коротка статистика профілю.' }
  ],
  teacher: [
    { id: 'overview', label: 'Огляд', subtitle: 'Картина по студентам, тестах і активності.' },
    { id: 'builder', label: 'Конструктор тестів', subtitle: 'Створюйте нові тести та додавайте запитання.' },
    { id: 'library', label: 'Бібліотека тестів', subtitle: 'Усі тести з можливістю видалення.' },
    { id: 'results', label: 'Результати студентів', subtitle: 'Журнал усіх проходжень тестів і їх інтерпретація.' },
    { id: 'wellbeing', label: 'Аналітика самопочуття', subtitle: 'Показники стану по студентам та узагальнені індекси.' },
    { id: 'profile', label: 'Профіль', subtitle: 'Інформація про викладача та активність у системі.' }
  ],
  admin: [
    { id: 'overview', label: 'Огляд', subtitle: 'Загальний стан платформи, активність та ключові показники.' },
    { id: 'users', label: 'Користувачі', subtitle: 'Керування ролями та статусами користувачів.' },
    { id: 'builder', label: 'Конструктор тестів', subtitle: 'Створюйте нові тести та доповнюйте бібліотеку.' },
    { id: 'library', label: 'Бібліотека тестів', subtitle: 'Контроль вмісту тестів та керування результатами.' },
    { id: 'results', label: 'Результати студентів', subtitle: 'Усі проходження тестів в одному журналі.' },
    { id: 'wellbeing', label: 'Аналітика самопочуття', subtitle: 'Зведена аналітика по студентам та ризикових зонах.' },
    { id: 'system', label: 'Система', subtitle: 'Розподіл ролей, нові події та системна статистика.' },
    { id: 'profile', label: 'Профіль', subtitle: 'Інформація про адміністратора та короткий зріз активності.' }
  ]
};

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDateTime(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('uk-UA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
}

function formatDate(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('uk-UA', {
    day: '2-digit',
    month: '2-digit'
  }).format(new Date(value));
}

function showToast(message, type = 'success') {
  toastEl.textContent = message;
  toastEl.className = `toast ${type}`;
  setTimeout(() => {
    toastEl.className = 'toast hidden';
  }, 3600);
}

async function apiRequest(url, options = {}) {
  const payload = options.body && typeof options.body !== 'string' ? JSON.stringify(options.body) : options.body;
  const response = await fetch(url, {
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options,
    body: payload
  });

  const data = await response.json().catch(() => ({}));

  if (response.status === 401) {
    window.location.href = '/auth';
    return null;
  }

  if (!response.ok) {
    throw new Error(data.message || 'Сталася помилка.');
  }

  return data;
}

function levelClass(level) {
  const text = String(level || '').toLowerCase();
  if (text.includes('високий ресурс') || text.includes('низький ризик')) return 'success';
  if (text.includes('помір')) return 'warning';
  if (text.includes('високий ризик') || text.includes('низький ресурс')) return 'danger';
  return 'neutral';
}

function createMetricCard(title, value, hint, accent = 'neutral') {
  return `
    <article class="metric-card surface">
      <span>${escapeHtml(title)}</span>
      <div class="metric-value">${escapeHtml(value)}</div>
      <div class="metric-hint"><span class="pill ${accent}">${escapeHtml(hint)}</span></div>
    </article>
  `;
}

function renderEmpty(title, description) {
  return `
    <div class="empty-state surface">
      <strong>${escapeHtml(title)}</strong>
      <p>${escapeHtml(description)}</p>
    </div>
  `;
}

function renderTimelineBars(timeline) {
  if (!timeline || !timeline.length) {
    return renderEmpty('Ще немає часової динаміки', 'Додай кілька записів самопочуття, щоб побачити зміни по днях.');
  }

  return `
    <div class="chart-card surface">
      <div class="panel-head">
        <div>
          <span class="muted">Останні записи</span>
          <h3>Динаміка настрою за останні дні</h3>
        </div>
        <div class="chart-legend">
          <span class="pill success">Настрій</span>
        </div>
      </div>
      <div class="chart-box">
        ${timeline
          .map((point) => {
            const mood = Number(point.mood || 0);
            const barHeight = Math.max(18, mood * 16); // 1..10 => 18..160 px

            return `
              <div class="chart-bar">
                <span style="height:${barHeight}px"></span>
                <strong>${escapeHtml(point.mood)}</strong>
                <small>${escapeHtml(formatDate(point.date))}</small>
              </div>
            `;
          })
          .join('')}
      </div>
    </div>
  `;
}

function renderRecommendationCards(recommendations) {
  if (!recommendations || !recommendations.length) {
    return renderEmpty('Рекомендації з’являться пізніше', 'Коли в системі буде більше даних, тут з’являться персональні рекомендації.');
  }

  return `
    <div class="cards-grid">
      ${recommendations
        .map(
          (item, index) => `
            <article class="summary-box surface">
              <span>${String(index + 1).padStart(2, '0')}</span>
              <p>${escapeHtml(item)}</p>
            </article>
          `
        )
        .join('')}
    </div>
  `;
}

function renderTestCards(tests, manageMode = false) {
  if (!tests.length) {
    return renderEmpty('Тестів поки немає', 'Додай перший тест, щоб студенти могли проходити його в системі.');
  }

  return `
    <div class="test-grid">
      ${tests
        .map(
          (test) => `
            <article class="test-card surface">
              <div class="test-head">
                <div>
                  <span>${escapeHtml(test.category)}</span>
                  <h3>${escapeHtml(test.title)}</h3>
                </div>
                <span class="pill ${test.mode === 'risk' ? 'warning' : 'success'}">${test.mode === 'risk' ? 'Ризик-модель' : 'Ресурс-модель'}</span>
              </div>
              <p>${escapeHtml(test.description)}</p>
              <div class="test-meta">
                <span class="meta-chip">${test.questions.length} запитань</span>
                <span class="meta-chip">${escapeHtml(test.durationMinutes)} хв</span>
                <span class="meta-chip">${escapeHtml(test.createdByName || 'Система')}</span>
              </div>
              <div class="inline-actions">
                ${manageMode
                  ? `<button class="btn danger" data-action="delete-test" data-test-id="${test.id}">Видалити</button>`
                  : `<button class="btn primary" data-action="open-test" data-test-id="${test.id}">Пройти тест</button>`}
              </div>
            </article>
          `
        )
        .join('')}
    </div>
  `;
}

function renderResultCards(results) {
  if (!results.length) {
    return renderEmpty('Результатів ще немає', 'Після першого тесту тут з’являться всі проходження з інтерпретацією.');
  }

  return `
    <div class="results-grid">
      ${results
        .map(
          (result) => `
            <article class="result-card surface">
              <div class="result-head">
                <div>
                  <span>${escapeHtml(result.category || 'Тест')}</span>
                  <h3>${escapeHtml(result.testTitle)}</h3>
                </div>
                <span class="pill ${result.reviewStatus === 'pending' ? 'warning' : levelClass(result.level)}">
  ${escapeHtml(result.level)}
</span>
              </div>
              <div class="result-meta">
  ${
    result.percentage !== null && result.percentage !== undefined
      ? `<span class="meta-chip">${escapeHtml(result.percentage)}%</span>`
      : `<span class="meta-chip">Авторський тест</span>`
  }
  ${
    result.score !== null && result.score !== undefined && result.maxScore !== null && result.maxScore !== undefined
      ? `<span class="meta-chip">${escapeHtml(result.score)} / ${escapeHtml(result.maxScore)}</span>`
      : `<span class="meta-chip">Перевірка викладача</span>`
  }
  <span class="meta-chip">${escapeHtml(formatDateTime(result.createdAt))}</span>
</div>
              <p>${escapeHtml(result.summary)}</p>
              <p><strong>Рекомендація:</strong> ${escapeHtml(result.recommendation)}</p>
            </article>
          `
        )
        .join('')}
    </div>
  `;
}

function renderResources(resources) {
  if (!resources.length) {
    return renderEmpty('Матеріалів поки немає', 'Коли ресурси буде додано, вони з’являться в цій вкладці.');
  }

  return `
    <div class="resource-grid">
      ${resources
        .map(
          (item) => `
            <article class="resource-card surface">
              <span>${escapeHtml(item.type)}</span>
              <h3>${escapeHtml(item.title)}</h3>
              <p>${escapeHtml(item.description)}</p>
            </article>
          `
        )
        .join('')}
    </div>
  `;
}
function getIndexLabel(value) {
  if (value >= 80) return 'Високий ресурс';
  if (value >= 50) return 'Стабільний стан';
  return 'Потрібна увага';
}
function renderStudentOverview() {
  const stats = state.studentStats || {
    wellbeingIndex: 0,
    averageMood: 0,
    averageStress: 0,
    averageEnergy: 0,
    totalEntries: 0,
    trend: 'Недостатньо даних',
    streak: 0,
    averageSleep: 0
  };
  const latestResult = state.myResults[0];
  const timeline = state.insights?.timeline || [];
  const recommendations = state.insights?.recommendations || [];

  return `
    <div class="workspace-grid">
      <div class="col-4">${createMetricCard(
  'Індекс стану',
  `${stats.wellbeingIndex}/100`,
  getIndexLabel(stats.wellbeingIndex),
  stats.wellbeingIndex >= 65 ? 'success' : stats.wellbeingIndex >= 45 ? 'warning' : 'danger'
)}</div>
      <div class="col-4">${createMetricCard('Середній настрій', stats.averageMood || '0', `${stats.totalEntries} записів`, 'student')}</div>
      <div class="col-4">${createMetricCard('Пройдено тестів', state.myResults.length, latestResult ? latestResult.level : 'Поки немає', latestResult ? levelClass(latestResult.level) : 'neutral')}</div>
      <div class="col-7">${renderTimelineBars(timeline)}</div>
      <div class="col-5">
        <div class="section-card surface">
          <div class="panel-head">
            <div>
              <span class="muted">Автоматичний висновок</span>
              <h3>Персональні рекомендації</h3>
            </div>
            <button class="btn secondary" data-action="switch-tab" data-tab-target="checkin">Новий запис</button>
          </div>
          <p>${escapeHtml(state.insights?.summary || 'Дані для висновків ще накопичуються.')}</p>
          ${renderRecommendationCards(recommendations)}
        </div>
      </div>
      <div class="col-12">
        <div class="cards-grid">
          <article class="summary-box surface">
            <span>Рівень стресу</span>
            <div class="metric-value">${stats.averageStress || 0}</div>
            <p>Середній рівень стресу за всіма записами.</p>
          </article>
          <article class="summary-box surface">
            <span>Енергія</span>
            <div class="metric-value">${stats.averageEnergy || 0}</div>
            <p>Середній суб’єктивний рівень енергії.</p>
          </article>
          <article class="summary-box surface">
            <span>Сон</span>
            <div class="metric-value">${stats.averageSleep || 0} год</div>
            <p>Середня кількість годин сну за записами.</p>
          </article>
          <article class="summary-box surface">
            <span>Серія записів</span>
            <div class="metric-value">${stats.streak || 0}</div>
            <p>Кількість унікальних днів, які вже зафіксовано в щоденнику.</p>
          </article>
        </div>
      </div>
    </div>
  `;
}

function renderCheckinTab() {
  const stats = state.studentStats || {};
  return `
    <div class="workspace-grid">
      <div class="col-8">
        <div class="section-card surface">
          <div class="panel-head">
            <div>
              <span class="muted">Новий запис</span>
              <h3>Оцініть поточний стан</h3>
            </div>
            <span class="pill student">Усі значення — від 1 до 10</span>
          </div>
          <form id="checkin-form" class="form-grid">
            <div class="range-grid">
              ${[
                ['mood', 'Настрій', 7],
                ['stress', 'Стрес', 4],
                ['energy', 'Енергія', 7],
                ['sleepHours', 'Сон (години)', 7],
                ['workload', 'Навантаження', 6]
              ]
                .map(
                  ([key, label, value]) => `
                    <div class="range-card">
                      <div class="range-top">
                        <span class="range-label">${label}</span>
                        <span class="inline-value" data-range-output="${key}">${value}</span>
                      </div>
                      <input type="range" name="${key}" min="1" max="10" value="${value}" step="1" data-range-input="${key}" />
                    </div>
                  `
                )
                .join('')}
            </div>
            <label>
              <span>Нотатка</span>
              <textarea name="note" placeholder="Коротко опишіть, як минув день або що найбільше вплинуло на ваш стан."></textarea>
            </label>
            <label>
              <span>Теги</span>
              <input type="text" name="tags" placeholder="сон, дедлайн, фокус, відновлення" />
            </label>
            <div class="inline-actions">
              <button class="btn primary" type="submit">Зберегти запис</button>
              <button class="btn secondary" type="button" data-action="switch-tab" data-tab-target="journal">Перейти до журналу</button>
            </div>
          </form>
        </div>
      </div>
      <div class="col-4">
        <div class="cards-grid">
          <article class="summary-box surface">
            <span>Поточний індекс</span>
            <div class="metric-value">${stats.wellbeingIndex || 0}/100</div>
            <p>${escapeHtml(stats.trend || 'Недостатньо даних')}</p>
          </article>
          <article class="summary-box surface">
            <span>Записів у щоденнику</span>
            <div class="metric-value">${stats.totalEntries || 0}</div>
            <p>Чим більше записів, тим точніше система бачить реальну динаміку.</p>
          </article>
        </div>
      </div>
    </div>
  `;
}

function renderJournalTab() {
  if (!state.checkins.length) {
    return renderEmpty('Журнал ще порожній', 'Створи перший запис у вкладці «Щоденник», щоб побачити історію спостережень.');
  }

  return `
    <div class="journal-list">
      ${state.checkins
        .map(
          (item) => `
            <article class="journal-item">
              <div class="journal-head">
                <div>
                  <strong>${escapeHtml(formatDateTime(item.createdAt))}</strong>
                  <p>${escapeHtml(item.note || 'Без додаткової нотатки')}</p>
                </div>
                <div class="inline-actions">
                  <span class="pill neutral">${escapeHtml(item.date)}</span>
                  <button class="btn danger" data-action="delete-checkin" data-checkin-id="${item.id}">Видалити</button>
                </div>
              </div>
              <div class="metric-strip">
                <span class="meta-chip">Настрій: ${escapeHtml(item.mood)}</span>
                <span class="meta-chip">Стрес: ${escapeHtml(item.stress)}</span>
                <span class="meta-chip">Енергія: ${escapeHtml(item.energy)}</span>
                <span class="meta-chip">Сон: ${escapeHtml(item.sleepHours)} год</span>
                <span class="meta-chip">Навантаження: ${escapeHtml(item.workload)}</span>
              </div>
              ${item.tags?.length ? `<div class="table-pills">${item.tags.map((tag) => `<span class="tag student">#${escapeHtml(tag)}</span>`).join('')}</div>` : ''}
            </article>
          `
        )
        .join('')}
    </div>
  `;
}

function renderStudentTests() {
  return renderTestCards(state.tests, false);
}

function renderStudentResults() {
  return renderResultCards(state.myResults);
}

function renderStudentResources() {
  return `
    <div class="workspace-grid">
      <div class="col-7">${renderResources(state.resources)}</div>
      <div class="col-5">
        <div class="section-card surface">
          <div class="panel-head">
            <div>
              <span class="muted">Практичний висновок</span>
              <h3>Що система радить зараз</h3>
            </div>
            <span class="pill success">Оновлюється після записів</span>
          </div>
          ${renderRecommendationCards(state.insights?.recommendations || [])}
        </div>
      </div>
    </div>
  `;
}

function renderProfile(roleSpecificText, showStats = true) {
  return `
    <div class="profile-grid">
      <article class="profile-card surface">
        <div class="profile-head">
          <div>
            <span>Профіль</span>
            <h3>${escapeHtml(state.user.fullName)}</h3>
          </div>
          <span class="pill ${state.role}">${ROLE_LABELS[state.role]}</span>
        </div>
        <div class="profile-meta">
          <span class="meta-chip">${escapeHtml(state.user.email)}</span>
          <span class="meta-chip">${escapeHtml(state.user.faculty)}</span>
          <span class="meta-chip">${escapeHtml(state.user.studyYear)}</span>
        </div>
        <p>${escapeHtml(roleSpecificText)}</p>
      </article>

      ${
        showStats
          ? `
            <article class="profile-card surface">
              <span>Статистика профілю</span>
              <h3>Короткий зріз активності</h3>
              <div class="cards-grid">
                <div class="summary-box surface soft-card">
                  <span>Записів</span>
                  <div class="metric-value">${state.profileStats?.checkins || 0}</div>
                </div>
                <div class="summary-box surface soft-card">
                  <span>Результатів</span>
                  <div class="metric-value">${state.profileStats?.results || 0}</div>
                </div>
                <div class="summary-box surface soft-card">
                  <span>Індекс</span>
                  <div class="metric-value">${state.profileStats?.wellbeing || 0}</div>
                </div>
              </div>
            </article>
          `
          : ''
      }
    </div>
  `;
}

function renderTeacherOverview() {
  const overview = state.overview;
  if (!overview) return renderEmpty('Немає даних', 'Спробуй оновити сторінку.');

  return `
    <div class="workspace-grid">
      <div class="col-3">${createMetricCard('Студенти', overview.counts.students, `${overview.counts.engagementRate}% залучення`, 'student')}</div>
      <div class="col-3">${createMetricCard('Активні тести', overview.counts.activeTests, `${overview.counts.results} результатів`, 'teacher')}</div>
      <div class="col-3">${createMetricCard('Записи стану', overview.counts.checkins, `Сер. настрій ${overview.wellbeing.averageMood || 0}`, 'success')}</div>
      <div class="col-3">${createMetricCard('Ризикова зона', overview.counts.atRiskStudents, 'Студенти з низьким індексом', overview.counts.atRiskStudents ? 'danger' : 'success')}</div>
      <div class="col-7">
        <div class="section-card surface">
          <div class="panel-head">
            <div>
              <span class="muted">Активність студентів</span>
              <h3>Останні зміни по профілях</h3>
            </div>
            <button class="btn secondary" data-action="switch-tab" data-tab-target="results">Усі результати</button>
          </div>
          <div class="users-list">
            ${overview.studentSummaries
              .slice(0, 5)
              .map(
                (student) => `
                  <article class="student-row">
                    <div class="student-head">
                      <div>
                        <strong>${escapeHtml(student.fullName)}</strong>
                        <p>${escapeHtml(student.faculty)} · ${escapeHtml(student.studyYear)}</p>
                      </div>
                      <span class="pill ${student.wellbeingIndex >= 60 ? 'success' : student.wellbeingIndex >= 45 ? 'warning' : 'danger'}">Індекс ${escapeHtml(student.wellbeingIndex)}</span>
                    </div>
                    <div class="table-pills">
                      <span class="meta-chip">Записів: ${escapeHtml(student.entries)}</span>
                      <span class="meta-chip">Тестів: ${escapeHtml(student.resultsCount)}</span>
                      <span class="meta-chip">Стрес: ${escapeHtml(student.averageStress || 0)}</span>
                    </div>
                  </article>
                `
              )
              .join('')}
          </div>
        </div>
      </div>
      <div class="col-5">
        <div class="section-card surface">
          <div class="panel-head">
            <div>
              <span class="muted">Останні проходження</span>
              <h3>Нові результати</h3>
            </div>
          </div>
          <div class="activity-list">
            ${overview.recentResults.length
              ? overview.recentResults
                  .map(
                    (result) => `
                      <article class="activity-item">
                        <div class="activity-head">
                          <div>
                            <strong>${escapeHtml(result.studentName)}</strong>
                            <p>${escapeHtml(result.testTitle)}</p>
                          </div>
                          <span class="pill ${levelClass(result.level)}">${escapeHtml(result.level)}</span>
                        </div>
                        <p>${escapeHtml(result.summary)}</p>
                        <span class="mini-muted">${escapeHtml(formatDateTime(result.createdAt))}</span>
                      </article>
                    `
                  )
                  .join('')
              : '<p class="small-note">Поки що немає результатів.</p>'}
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderBuilderTab() {
  return `
    <div class="workspace-grid">
      <div class="col-8">
        <div class="section-card surface">
          <div class="panel-head">
            <div>
              <span class="muted">Конструктор</span>
              <h3>Додати новий тест</h3>
            </div>
            <span class="pill teacher">Створення доступне для ролей викладач і адміністратор</span>
          </div>
          <form id="test-builder-form" class="form-grid">
            <label>
              <span>Назва тесту</span>
              <input type="text" name="title" placeholder="Наприклад: Тест адаптації до навчального ритму" required />
            </label>
            <label>
              <span>Опис</span>
              <textarea name="description" placeholder="Коротко опишіть, що саме вимірює цей тест." required></textarea>
            </label>
            <div class="range-grid">
              <label>
                <span>Категорія</span>
                <input type="text" name="category" placeholder="Ресурс / Навантаження / Концентрація" required />
              </label>
              <label>
                <span>Тривалість (хвилини)</span>
                <input type="number" name="durationMinutes" value="5" min="1" max="60" required />
              </label>
            </div>
            <label>
              <span>Модель інтерпретації</span>
              <select name="mode">
                <option value="resource">Чим вищий бал, тим кращий ресурс</option>
                <option value="risk">Чим вищий бал, тим вищий ризик</option>
              </select>
            </label>
            <label class="toggle-row">
              <span>Тип відповідей</span>
                <select name="answerType" id="answer-type-select">
                  <option value="scale">Стандартна шкала 1–5</option>
                  <option value="custom">Власні варіанти відповідей</option>
                </select>
            </label>
            <label id="questions-scale-block">
              <span>Запитання (кожне з нового рядка)</span>
              <textarea
                name="questions"
                placeholder="Я легко відновлююся після складного навчального дня.&#10;Мені вистачає часу на відпочинок між дедлайнами.&#10;Я зберігаю концентрацію під час навчальних блоків."
                 required
              ></textarea>
            </label>

            <label id="questions-custom-block" style="display:none;">
              <span>Запитання та варіанти відповідей</span>
              <textarea
                name="customQuestions"
                placeholder="Формат:&#10;&#10;Який твій настрій сьогодні?&#10;- Добрий&#10;- Нормальний&#10;- Поганий&#10;&#10;Як ти оцінюєш навантаження?&#10;- Легке&#10;- Помірне&#10;- Високе"
              ></textarea>
            </label>
            <div class="inline-actions">
              <button class="btn primary" type="submit">Додати тест</button>
              <button class="btn secondary" type="button" data-action="switch-tab" data-tab-target="library">Перейти до бібліотеки</button>
            </div>
          </form>
        </div>
      </div>
      <div class="col-4">
        <div class="section-card surface">
          <span>Логіка оцінювання</span>
          <h3>Як система формує результат</h3>
          <ul class="card-list">
            <li>Студент оцінює кожне запитання за шкалою 1–5.</li>
            <li>Система підсумовує бали та переводить їх у відсоток.</li>
            <li>На основі моделі тесту формується рівень, висновок і рекомендація.</li>
          </ul>
        </div>
      </div>
    </div>
  `;
}
function bindBuilderModeToggle() {
  const select = document.getElementById('answer-type-select');
  const scaleBlock = document.getElementById('questions-scale-block');
  const customBlock = document.getElementById('questions-custom-block');

  const scaleTextarea = scaleBlock?.querySelector('textarea[name="questions"]');
  const customTextarea = customBlock?.querySelector('textarea[name="customQuestions"]');

  if (!select || !scaleBlock || !customBlock || !scaleTextarea || !customTextarea) return;

  const sync = () => {
    const isCustom = select.value === 'custom';

    scaleBlock.style.display = isCustom ? 'none' : '';
    customBlock.style.display = isCustom ? '' : 'none';

    scaleTextarea.required = !isCustom;
    scaleTextarea.disabled = isCustom;

    customTextarea.required = isCustom;
    customTextarea.disabled = !isCustom;
  };

  select.addEventListener('change', sync);
  sync();
}
function renderLibraryTab() {
  return renderTestCards(state.tests, true);
}

function renderResultsTable(results) {
  if (!results.length) {
    return renderEmpty('Результати відсутні', 'Коли студенти почнуть проходити тести, результати з’являться тут.');
  }

  return `
    <div class="data-table-wrap surface">
      <table class="data-table">
        <thead>
          <tr>
            <th>Студент</th>
            <th>Тест</th>
            <th>Рівень</th>
            <th>Бал</th>
            <th>Дата</th>
            <th>Короткий висновок</th>
            <th>Дія</th>
          </tr>
        </thead>
        <tbody>
          ${results
            .map(
              (result) => `
                <tr>
                  <td>
                    <strong>${escapeHtml(result.studentName || '—')}</strong><br />
                    <span class="small-note">${escapeHtml(result.faculty || '')}</span>
                  </td>
                  <td>${escapeHtml(result.testTitle)}</td>
                  <td>
                    <span class="pill ${
                      result.reviewStatus === 'pending'
                        ? 'warning'
                        : levelClass(result.level)
                    }">
                      ${escapeHtml(result.level)}
                    </span>
                  </td>
                  <td>
                    ${
                      result.percentage !== null && result.percentage !== undefined
                        ? `${escapeHtml(result.percentage)}%`
                        : '—'
                    }
                  </td>
                  <td>${escapeHtml(formatDateTime(result.createdAt))}</td>
                  <td>${escapeHtml(result.summary)}</td>
                  <td>
                    ${
                      result.reviewStatus === 'pending'
                        ? `<button class="btn primary" data-action="review-result" data-result-id="${result.id}">Оцінити</button>`
                        : '<span class="small-note">Готово</span>'
                    }
                  </td>
                </tr>
              `
            )
            .join('')}
        </tbody>
      </table>
    </div>
  `;
}

function getFilteredResults() {
  const query = state.filters.resultsQuery.trim().toLowerCase();
  if (!query) return state.allResults;
  return state.allResults.filter((result) =>
    [result.studentName, result.studentEmail, result.testTitle, result.category, result.level]
      .join(' ')
      .toLowerCase()
      .includes(query)
  );
}

function renderTeacherResults() {
  const filteredResults = getFilteredResults();
  return `
    <div class="workspace-content-stack">
      <div class="section-card surface">
        <form id="results-filter-form" class="filter-row">
          <label style="flex:1 1 320px;">
            <span>Фільтр</span>
            <input type="text" name="query" value="${escapeHtml(state.filters.resultsQuery)}" placeholder="Пошук за студентом, тестом або рівнем" />
          </label>
          <div class="inline-actions">
            <button class="btn primary" type="submit">Застосувати</button>
            <button class="btn ghost" type="button" data-action="reset-results-filter">Скинути</button>
          </div>
        </form>
      </div>
      ${renderResultsTable(filteredResults)}
    </div>
  `;
}

function renderWellbeingAnalytics() {
  const overview = state.overview;
  if (!overview) return renderEmpty('Немає аналітики', 'Спробуй оновити сторінку.');

  return `
    <div class="workspace-grid">
      <div class="col-4">${createMetricCard('Сер. настрій', overview.wellbeing.averageMood || 0, 'За всіма записами', 'success')}</div>
      <div class="col-4">${createMetricCard('Сер. стрес', overview.wellbeing.averageStress || 0, 'Чим нижче, тим краще', overview.wellbeing.averageStress >= 6 ? 'danger' : 'success')}</div>
      <div class="col-4">${createMetricCard('Сер. сон', `${overview.wellbeing.averageSleep || 0} год`, 'За всіма записами', 'student')}</div>
      <div class="col-7">
        <div class="section-card surface">
          <div class="panel-head">
            <div>
              <span class="muted">Студентські профілі</span>
              <h3>Індекси стану по студентам</h3>
            </div>
          </div>
          <div class="users-list">
            ${overview.studentSummaries.length
              ? overview.studentSummaries
                  .map(
                    (student) => `
                      <article class="student-row">
                        <div class="student-head">
                          <div>
                            <strong>${escapeHtml(student.fullName)}</strong>
                            <p>${escapeHtml(student.faculty)} · ${escapeHtml(student.studyYear)}</p>
                          </div>
                          <span class="pill ${student.wellbeingIndex >= 60 ? 'success' : student.wellbeingIndex >= 45 ? 'warning' : 'danger'}">${escapeHtml(student.wellbeingIndex)} / 100</span>
                        </div>
                        <div class="table-pills">
                          <span class="meta-chip">Настрій: ${escapeHtml(student.averageMood || 0)}</span>
                          <span class="meta-chip">Стрес: ${escapeHtml(student.averageStress || 0)}</span>
                          <span class="meta-chip">Записів: ${escapeHtml(student.entries)}</span>
                          <span class="meta-chip">Тестів: ${escapeHtml(student.resultsCount)}</span>
                        </div>
                      </article>
                    `
                  )
                  .join('')
              : '<p class="small-note">Поки що немає студентських записів.</p>'}
          </div>
        </div>
      </div>
      <div class="col-5">
        <div class="section-card surface">
          <div class="panel-head">
            <div>
              <span class="muted">Тести</span>
              <h3>Середні результати по тестах</h3>
            </div>
          </div>
          <div class="activity-list">
            ${overview.testAnalytics.length
              ? overview.testAnalytics
                  .map(
                    (test) => `
                      <article class="activity-item">
                        <div class="activity-head">
                          <div>
                            <strong>${escapeHtml(test.title)}</strong>
                            <p>${escapeHtml(test.category)}</p>
                          </div>
                          <span class="pill neutral">${escapeHtml(test.averagePercentage)}%</span>
                        </div>
                        <div class="table-pills">
                          <span class="meta-chip">Спроб: ${escapeHtml(test.attempts)}</span>
                          <span class="meta-chip">Високий: ${escapeHtml(test.distribution.high)}</span>
                          <span class="meta-chip">Помірний: ${escapeHtml(test.distribution.medium)}</span>
                          <span class="meta-chip">Низький: ${escapeHtml(test.distribution.low)}</span>
                        </div>
                      </article>
                    `
                  )
                  .join('')
              : '<p class="small-note">Поки що тестів або результатів немає.</p>'}
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderUsersTab() {
  if (!state.users.length) return renderEmpty('Користувачів немає', 'Коли в системі з’являться профілі, вони відобразяться тут.');

  return `
    <div class="data-table-wrap surface">
      <table class="data-table">
        <thead>
          <tr>
            <th>Користувач</th>
            <th>Роль</th>
            <th>Статус</th>
            <th>Активність</th>
            <th>Керування</th>
          </tr>
        </thead>
        <tbody>
          ${state.users
            .map(
              (user) => `
                <tr data-user-row="${user.id}">
                  <td>
                    <strong>${escapeHtml(user.fullName)}</strong><br />
                    <span class="small-note">${escapeHtml(user.email)} · ${escapeHtml(user.faculty)}</span>
                  </td>
                  <td>
                    <select data-user-role="${user.id}" ${user.id === state.user.id ? 'disabled' : ''}>
                      <option value="student" ${user.role === 'student' ? 'selected' : ''}>Студент</option>
                      <option value="teacher" ${user.role === 'teacher' ? 'selected' : ''}>Викладач</option>
                      <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Адміністратор</option>
                    </select>
                  </td>
                  <td>
                    <select data-user-status="${user.id}" ${user.id === state.user.id ? 'disabled' : ''}>
                      <option value="active" ${user.status === 'active' ? 'selected' : ''}>Активний</option>
                      <option value="inactive" ${user.status === 'inactive' ? 'selected' : ''}>Неактивний</option>
                    </select>
                  </td>
                  <td>
                    <span class="small-note">Записів: ${escapeHtml(user.checkins)}<br />Результатів: ${escapeHtml(user.results)}</span>
                  </td>
                  <td>
                    ${user.id === state.user.id 
  ? '<span class="pill neutral">Поточний обліковий запис</span>' 
  : `
    <div class="inline-actions" style="gap: 8px;">
      <button class="btn primary" data-action="save-user" data-user-id="${user.id}">Зберегти</button>
      <button class="btn danger" data-action="delete-user" data-user-id="${user.id}">🗑️ Видалити</button>
    </div>
  `}
                  </td>
                </tr>
              `
            )
            .join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderSystemTab() {
  const system = state.system;
  if (!system) return renderEmpty('Немає системних даних', 'Спробуй оновити сторінку.');

  return `
    <div class="workspace-grid">
      <div class="col-3">${createMetricCard('Усього користувачів', system.counts.users, `${system.counts.activeUsers} активних`, 'admin')}</div>
      <div class="col-3">${createMetricCard('Тести', system.counts.tests, `${system.counts.results} результатів`, 'teacher')}</div>
      <div class="col-3">${createMetricCard('Записи самопочуття', system.counts.checkins, 'Загальний обсяг даних', 'student')}</div>
      <div class="col-3">${createMetricCard('Матеріали', system.counts.resources, 'Доступні всім ролям', 'success')}</div>
      <div class="col-6">
        <div class="section-card surface">
          <span>Розподіл ролей</span>
          <h3>Хто працює в системі</h3>
          <div class="cards-grid">
            <div class="summary-box surface soft-card">
              <span>Студенти</span>
              <div class="metric-value">${system.roleDistribution.student}</div>
            </div>
            <div class="summary-box surface soft-card">
              <span>Викладачі</span>
              <div class="metric-value">${system.roleDistribution.teacher}</div>
            </div>
            <div class="summary-box surface soft-card">
              <span>Адміни</span>
              <div class="metric-value">${system.roleDistribution.admin}</div>
            </div>
          </div>
        </div>
      </div>
      <div class="col-6">
        <div class="section-card surface">
          <span>Нові профілі</span>
          <h3>Останні користувачі</h3>
          <div class="activity-list">
            ${system.latestUsers
              .map(
                (user) => `
                  <article class="activity-item">
                    <div class="activity-head">
                      <div>
                        <strong>${escapeHtml(user.fullName)}</strong>
                        <p>${escapeHtml(user.email)}</p>
                      </div>
                      <span class="pill ${user.role}">${ROLE_LABELS[user.role]}</span>
                    </div>
                    <span class="mini-muted">Створено: ${escapeHtml(formatDateTime(user.createdAt))}</span>
                  </article>
                `
              )
              .join('')}
          </div>
        </div>
      </div>
      <div class="col-12">
        <div class="section-card surface">
          <span>Події</span>
          <h3>Остання активність у платформі</h3>
          <div class="activity-list">
            ${system.latestEvents
              .map(
                (event) => `
                  <article class="activity-item">
                    <div class="activity-head">
                      <div>
                        <strong>${escapeHtml(event.label)}</strong>
                        <p>${escapeHtml(event.userName)}</p>
                      </div>
                      <span class="pill neutral">${escapeHtml(formatDateTime(event.createdAt))}</span>
                    </div>
                  </article>
                `
              )
              .join('')}
          </div>
        </div>
      </div>
    </div>
  `;
}

function getTabTemplate() {
  const roleMap = {
    student: {
      overview: renderStudentOverview,
      checkin: renderCheckinTab,
      journal: renderJournalTab,
      tests: renderStudentTests,
      results: renderStudentResults,
      resources: renderStudentResources,
      profile: () => renderProfile('У студентському кабінеті зібрані щоденник самопочуття, тести, результати й персональні рекомендації.', true)
    },
    teacher: {
      overview: renderTeacherOverview,
      builder: renderBuilderTab,
      library: renderLibraryTab,
      results: renderTeacherResults,
      wellbeing: renderWellbeingAnalytics,
      profile: () => renderProfile('У викладацькому кабінеті доступні конструктор тестів, журнал результатів та аналітика по студентам.', false)
    },
    admin: {
      overview: () => `${renderTeacherOverview()}<div class="workspace-content-stack">${renderSystemTab()}</div>`,
      users: renderUsersTab,
      builder: renderBuilderTab,
      library: renderLibraryTab,
      results: renderTeacherResults,
      wellbeing: renderWellbeingAnalytics,
      system: renderSystemTab,
      profile: () => renderProfile('Адміністратор керує користувачами, вмістом тестів і контролює загальний стан системи.', false)
    }
  };

  return roleMap[state.role][state.activeTab];
}

function renderSidebar() {
  sidebarNav.innerHTML = state.tabs
    .map(
      (tab) => `
        <button class="sidebar-btn ${state.activeTab === tab.id ? 'active' : ''}" data-action="switch-tab" data-tab-target="${tab.id}">
          ${escapeHtml(tab.label)}
        </button>
      `
    )
    .join('');
}

function renderHeader() {
  const activeConfig = state.tabs.find((tab) => tab.id === state.activeTab);
  pageEyebrowEl.textContent = ROLE_LABELS[state.role] || 'Кабінет';
  pageTitleEl.textContent = activeConfig?.label || 'Кабінет';
  pageSubtitleEl.textContent = activeConfig?.subtitle || 'Робочий розділ';
  profileNameEl.textContent = state.user.fullName;
  profileMetaEl.textContent = `${state.user.faculty} · ${state.user.studyYear}`;
  sidebarRoleEl.textContent = ROLE_LABELS[state.role] || 'Кабінет';
  rolePillEl.className = `pill ${state.role}`;
  rolePillEl.textContent = ROLE_LABELS[state.role] || 'Користувач';
}

function renderActiveTab() {
  renderSidebar();
  renderHeader();
  const template = getTabTemplate();
  workspaceContent.innerHTML = template ? template() : renderEmpty('Розділ ще не готовий', 'Спробуй вибрати іншу вкладку.');
  bindRangeOutputs();
  bindBuilderModeToggle();
}
function parseCustomQuestions(rawText) {
  return String(rawText || '')
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block, index) => {
      const lines = block
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

      const text = lines[0] || `Питання ${index + 1}`;
      const options = lines
        .slice(1)
        .map((line, optionIndex) => ({
          text: line.replace(/^-+\s*/, '').trim(),
          value: optionIndex + 1
        }))
        .filter((item) => item.text);

      return { text, options };
    })
    .filter((item) => item.text && item.options.length >= 2);
}
function bindRangeOutputs() {
  workspaceContent.querySelectorAll('[data-range-input]').forEach((input) => {
    const key = input.dataset.rangeInput;
    const output = workspaceContent.querySelector(`[data-range-output="${key}"]`);
    if (output) {
      output.textContent = input.value;
    }
  });
}

async function loadBaseProfile() {
  const payload = await apiRequest('/api/me');
  if (!payload) return;
  state.user = payload.user;
  state.profileStats = payload.profileStats;
  state.role = payload.user.role;
  state.tabs = TAB_CONFIG[state.role];
  state.activeTab = state.activeTab && state.tabs.some((tab) => tab.id === state.activeTab) ? state.activeTab : state.tabs[0].id;
}

async function loadRoleData() {
  if (state.role === 'student') {
    const [checkinsData, insightsData, testsData, resultsData, resourcesData] = await Promise.all([
      apiRequest('/api/checkins'),
      apiRequest('/api/insights'),
      apiRequest('/api/tests'),
      apiRequest('/api/results/my'),
      apiRequest('/api/resources')
    ]);
    state.checkins = checkinsData.checkins;
    state.studentStats = checkinsData.stats;
    state.insights = insightsData;
    state.tests = testsData.tests;
    state.myResults = resultsData.results;
    state.resources = resourcesData.resources;
    return;
  }

  const teacherRequests = [apiRequest('/api/teacher/overview'), apiRequest('/api/tests'), apiRequest('/api/results/all')];
  if (state.role === 'admin') {
    teacherRequests.push(apiRequest('/api/admin/users'), apiRequest('/api/admin/system'));
  }

  const responses = await Promise.all(teacherRequests);
  state.overview = responses[0];
  state.tests = responses[1].tests;
  state.allResults = responses[2].results;

  if (state.role === 'admin') {
    state.users = responses[3].users;
    state.system = responses[4];
  }
}

async function refreshData(showMessage) {
  await loadBaseProfile();
  await loadRoleData();
  renderActiveTab();
  if (showMessage) {
    showToast(showMessage);
  }
}

function updateClock() {
  const now = new Intl.DateTimeFormat('uk-UA', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit'
  }).format(new Date());
  clockPillEl.textContent = now;
}

function openModal(content) {
  modalRoot.innerHTML = content;
  modalRoot.classList.remove('hidden');
}

function closeModal() {
  modalRoot.classList.add('hidden');
  modalRoot.innerHTML = '';
}

function getResultById(resultId) {
  return state.allResults.find((result) => result.id === resultId);
}
function getTestById(testId) {
  return state.tests.find((test) => test.id === testId);
}
function buildReviewModal(result) {
  const test = state.tests.find((item) => item.id === result.testId);

  const answerItems = (result.answers || []).map((answer, index) => {
    const question = test?.questions?.find((q) => q.id === answer.questionId);
    const option = question?.options?.find((opt) => Number(opt.value) === Number(answer.value));

    return `
      <article class="question-card">
        <strong>${index + 1}. ${escapeHtml(question?.text || 'Питання')}</strong>
        <p><strong>Відповідь студента:</strong> ${escapeHtml(option?.text || answer.value)}</p>
      </article>
    `;
  }).join('');

  return `
    <div class="modal-card">
      <div class="modal-head">
        <div>
          <span>${escapeHtml(result.category || 'Тест')}</span>
          <h2>${escapeHtml(result.testTitle)}</h2>
          <p>${escapeHtml(result.studentName || 'Студент')}</p>
        </div>
        <button class="btn ghost" data-action="close-modal">Закрити</button>
      </div>

      <div class="question-stack">
        ${answerItems || '<p>Відповіді не знайдено.</p>'}
      </div>

      <form id="review-result-form" class="form-grid" data-result-id="${result.id}">
        <label>
          <span>Рівень</span>
          <select name="level" required>
            <option value="Низький ресурс">Низький ресурс</option>
            <option value="Помірний ресурс">Помірний ресурс</option>
            <option value="Високий ресурс">Високий ресурс</option>
            <option value="Низький ризик">Низький ризик</option>
            <option value="Помірний ризик">Помірний ризик</option>
            <option value="Високий ризик">Високий ризик</option>
          </select>
        </label>

        <label>
          <span>Короткий висновок</span>
          <textarea name="summary" required placeholder="Опишіть підсумок перевірки."></textarea>
        </label>

        <label>
          <span>Рекомендація</span>
          <textarea name="recommendation" required placeholder="Що варто зробити студенту далі."></textarea>
        </label>

        <div class="inline-actions">
          <button class="btn primary" type="submit">Зберегти оцінювання</button>
          <button class="btn ghost" type="button" data-action="close-modal">Скасувати</button>
        </div>
      </form>
    </div>
  `;
}

async function handleCheckinSubmit(form) {
  const formData = new FormData(form);
  const payload = Object.fromEntries(formData.entries());
  await apiRequest('/api/checkins', { method: 'POST', body: payload });
  await refreshData('Запис самопочуття збережено.');
  state.activeTab = 'journal';
  renderActiveTab();
}

async function handleTestBuilderSubmit(form) {
  const formData = new FormData(form);
  const answerType = String(formData.get('answerType') || 'scale');

  let payload = {
    title: String(formData.get('title') || '').trim(),
    description: String(formData.get('description') || '').trim(),
    category: String(formData.get('category') || '').trim(),
    mode: String(formData.get('mode') || 'resource'),
    durationMinutes: Number(formData.get('durationMinutes') || 5),
    answerType
  };

  if (answerType === 'custom') {
    const questions = parseCustomQuestions(formData.get('customQuestions'));

    if (questions.length < 2) {
      showToast('Для тесту з власними варіантами потрібно щонайменше 2 запитання, у кожному має бути мінімум 2 варіанти відповіді.', 'error');
      return;
    }

    payload.questions = questions;
  } else {
    const questions = String(formData.get('questions') || '')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (questions.length < 2) {
      showToast('Для стандартного тесту потрібно щонайменше 2 запитання.', 'error');
      return;
    }

    payload.questions = questions;
  }

  try {
    await apiRequest('/api/tests', { method: 'POST', body: payload });
    await refreshData('Тест додано до бібліотеки.');
    state.activeTab = 'library';
    renderActiveTab();
  } catch (error) {
    showToast(error.message || 'Не вдалося створити тест.', 'error');
  }
}
async function handleReviewResultSubmit(form) {
  const resultId = form.dataset.resultId;
  const formData = new FormData(form);

  await apiRequest(`/api/results/${resultId}/review`, {
    method: 'PATCH',
    body: {
      level: String(formData.get('level') || '').trim(),
      summary: String(formData.get('summary') || '').trim(),
      recommendation: String(formData.get('recommendation') || '').trim()
    }
  });

  closeModal();
  await refreshData('Результат оцінено.');
  state.activeTab = 'results';
  renderActiveTab();
}
async function handleModalTestSubmit(form) {
  const testId = form.dataset.testId;
  const test = getTestById(testId);
  if (!test) return;

  const answers = test.questions.map((question) => {
    const selected = form.querySelector(`input[name="${question.id}"]:checked`);
    return {
      questionId: question.id,
      value: Number(selected?.value || 0)
    };
  });

  await apiRequest(`/api/tests/${testId}/submit`, {
    method: 'POST',
    body: { answers }
  });

  closeModal();
  await refreshData('Тест завершено. Результат додано в журнал.');
  state.activeTab = 'results';
  renderActiveTab();
}

async function handleDeleteCheckin(checkinId) {
  if (!window.confirm('Видалити цей запис із журналу?')) return;
  await apiRequest(`/api/checkins/${checkinId}`, { method: 'DELETE' });
  await refreshData('Запис видалено.');
}

async function handleDeleteTest(testId) {
  if (!window.confirm('Видалити тест і всі пов’язані результати?')) return;
  await apiRequest(`/api/tests/${testId}`, { method: 'DELETE' });
  await refreshData('Тест видалено.');
}

async function handleSaveUser(userId) {
  const roleField = document.querySelector(`[data-user-role="${userId}"]`);
  const statusField = document.querySelector(`[data-user-status="${userId}"]`);
  await apiRequest(`/api/admin/users/${userId}`, {
    method: 'PATCH',
    body: {
      role: roleField?.value,
      status: statusField?.value
    }
  });
  await refreshData('Профіль користувача оновлено.');
}
async function handleDeleteUser(userId) {
  // Отримуємо ім'я користувача для підтвердження
  const userRow = document.querySelector(`[data-user-row="${userId}"]`);
  const userName = userRow?.querySelector('strong')?.textContent || 'цього користувача';
  
  if (!window.confirm(`Ви впевнені, що хочете видалити ${userName}?\n\nВсі його checkins та результати тестів будуть безповоротно втрачені!`)) {
    return;
  }
  
  await apiRequest(`/api/admin/users/${userId}`, { method: 'DELETE' });
  await refreshData('Користувача видалено.');
}
async function handleLogout() {
  await apiRequest('/api/logout', { method: 'POST' });
  window.location.href = '/auth';
}

sidebarNav.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action="switch-tab"]');
  if (!button) return;
  state.activeTab = button.dataset.tabTarget;
  renderActiveTab();
});

workspaceContent.addEventListener('click', async (event) => {
  const trigger = event.target.closest('[data-action]');
  if (!trigger) return;

  try {
    const action = trigger.dataset.action;
    if (action === 'switch-tab') {
      state.activeTab = trigger.dataset.tabTarget;
      renderActiveTab();
    }
    if (action === 'review-result') {
  const result = getResultById(trigger.dataset.resultId);
  if (result) openModal(buildReviewModal(result));
}
    if (action === 'open-test') {
      const test = getTestById(trigger.dataset.testId);
      if (test) openModal(buildTestModal(test));
    }
    if (action === 'delete-checkin') {
      await handleDeleteCheckin(trigger.dataset.checkinId);
    }
    if (action === 'delete-test') {
      await handleDeleteTest(trigger.dataset.testId);
    }
    if (action === 'save-user') {
      await handleSaveUser(trigger.dataset.userId);
    }
    if (action === 'delete-user') {
  await handleDeleteUser(trigger.dataset.userId);
}
    if (action === 'reset-results-filter') {
      state.filters.resultsQuery = '';
      renderActiveTab();
    }
  } catch (error) {
    showToast(error.message, 'error');
  }
});
function buildTestModal(test) {
  return `
    <div class="modal-card">
      <div class="modal-head">
        <div>
          <span>${escapeHtml(test.category)}</span>
          <h2>${escapeHtml(test.title)}</h2>
          <p>${escapeHtml(test.description || '')}</p>
        </div>
        <button class="btn ghost" data-action="close-modal">Закрити</button>
      </div>

      <form id="modal-test-form" class="form-grid" data-test-id="${test.id}">
        <div class="question-stack">
          ${test.questions
            .map((question, index) => {
              const isCustom =
                test.answerType === 'custom' &&
                Array.isArray(question.options) &&
                question.options.length > 0;

              const answersHtml = isCustom
                ? question.options
                    .map(
                      (option) => `
                        <label class="answer-option">
                          <input type="radio" name="${question.id}" value="${option.value}" required />
                          <span>${escapeHtml(option.text)}</span>
                        </label>
                      `
                    )
                    .join('')
                : [
                    ['1', 'Майже ніколи / не погоджуюсь'],
                    ['2', 'Рідко'],
                    ['3', 'Іноді'],
                    ['4', 'Часто'],
                    ['5', 'Майже завжди / повністю погоджуюсь']
                  ]
                    .map(
                      ([value, label]) => `
                        <label class="answer-option">
                          <input type="radio" name="${question.id}" value="${value}" required />
                          <span>${label}</span>
                        </label>
                      `
                    )
                    .join('');

              return `
                <article class="question-card">
                  <strong>${index + 1}. ${escapeHtml(question.text || '')}</strong>
                  <div class="answer-scale">
                    ${answersHtml}
                  </div>
                </article>
              `;
            })
            .join('')}
        </div>

        <div class="inline-actions">
          <button class="btn primary" type="submit">Завершити тест</button>
          <button class="btn ghost" type="button" data-action="close-modal">Скасувати</button>
        </div>
      </form>
    </div>
  `;
}
workspaceContent.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.target;
  try {
    if (form.id === 'checkin-form') {
      await handleCheckinSubmit(form);
    }
    if (form.id === 'test-builder-form') {
      await handleTestBuilderSubmit(form);
    }
    if (form.id === 'results-filter-form') {
      const data = new FormData(form);
      state.filters.resultsQuery = String(data.get('query') || '');
      renderActiveTab();
    }
  } catch (error) {
    showToast(error.message, 'error');
  }
});

workspaceContent.addEventListener('input', (event) => {
  const target = event.target;
  if (target.matches('[data-range-input]')) {
    const output = workspaceContent.querySelector(`[data-range-output="${target.dataset.rangeInput}"]`);
    if (output) output.textContent = target.value;
  }
});

modalRoot.addEventListener('click', (event) => {
  if (event.target === modalRoot || event.target.closest('[data-action="close-modal"]')) {
    closeModal();
  }
});

modalRoot.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.target;

  try {
    if (form.id === 'modal-test-form') {
      await handleModalTestSubmit(form);
    }

    if (form.id === 'review-result-form') {
      await handleReviewResultSubmit(form);
    }
  } catch (error) {
    showToast(error.message, 'error');
  }
});

logoutBtn.addEventListener('click', async () => {
  try {
    await handleLogout();
  } catch (error) {
    showToast(error.message, 'error');
  }
});

async function init() {
  try {
    updateClock();
    setInterval(updateClock, 60_000);
    await refreshData();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

init();

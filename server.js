const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DB_DIR = path.join(ROOT, 'data');
const DB_PATH = path.join(DB_DIR, 'database.json');

const DEFAULT_ACCOUNTS = [
  {
    id: 'usr-admin-default',
    fullName: 'Системний адміністратор',
    email: 'admin@campuspulse.local',
    password: 'Admin123!',
    faculty: 'Центральне адміністрування',
    studyYear: 'Адміністратор',
    role: 'admin'
  },
  {
    id: 'usr-teacher-default',
    fullName: 'Марія Коваль',
    email: 'teacher@campuspulse.local',
    password: 'Teacher123!',
    faculty: 'Кафедра психології та педагогіки',
    studyYear: 'Викладач',
    role: 'teacher'
  },
  {
    id: 'usr-student-default',
    fullName: 'Олена Іваненко',
    email: 'student@campuspulse.local',
    password: 'Student123!',
    faculty: 'Компʼютерні науки',
    studyYear: '3 курс',
    role: 'student'
  }
];

const DEFAULT_RESOURCES = [
  {
    id: 'res-breath',
    title: 'Дихальна техніка 4-6',
    type: 'Відновлення',
    description: '6 циклів спокійного дихання перед навчальним блоком допомагають знизити напруження та стабілізувати увагу.'
  },
  {
    id: 'res-focus',
    title: 'Правило 50/10 для концентрації',
    type: 'Фокус',
    description: '50 хвилин цілеспрямованої роботи і 10 хвилин короткого відпочинку допомагають підтримувати стабільну продуктивність.'
  },
  {
    id: 'res-sleep',
    title: 'Базовий чеклист сну',
    type: 'Сон',
    description: 'Стабільний час відходу до сну, провітрювання кімнати та відмова від яскравих екранів за 40 хвилин до сну.'
  },
  {
    id: 'res-balance',
    title: 'Мікропауза між парами',
    type: 'Баланс',
    description: 'Вода, коротка хода і одна хвилина тиші допомагають перейти між навчальними навантаженнями без перевтоми.'
  }
];

const DEFAULT_TESTS = [
  {
    id: 'test-resource-default',
    title: 'Тест емоційного ресурсу',
    description: 'Коротка оцінка внутрішнього ресурсу, здатності відновлюватися та зберігати мотивацію під час навчання.',
    category: 'Ресурс',
    mode: 'resource',
    durationMinutes: 5,
    status: 'active',
    createdBy: 'usr-teacher-default',
    createdByName: 'Марія Коваль',
    questions: [
      { id: 'q-er-1', text: 'Я відчуваю достатньо сил для виконання щоденних навчальних завдань.' },
      { id: 'q-er-2', text: 'Після відпочинку я швидко повертаюся до продуктивного стану.' },
      { id: 'q-er-3', text: 'Мені легко зберігати інтерес до навчання протягом тижня.' },
      { id: 'q-er-4', text: 'Я відчуваю, що контролюю свій темп навчання.' },
      { id: 'q-er-5', text: 'Після складного дня я можу досить швидко відновитися.' }
    ],
    createdAt: '2026-03-16T08:00:00.000Z'
  },
  {
    id: 'test-load-default',
    title: 'Шкала навчального перевантаження',
    description: 'Оцінка субʼєктивного навантаження, втоми та ризику виснаження через інтенсивний навчальний ритм.',
    category: 'Навантаження',
    mode: 'risk',
    durationMinutes: 6,
    status: 'active',
    createdBy: 'usr-teacher-default',
    createdByName: 'Марія Коваль',
    questions: [
      { id: 'q-wl-1', text: 'Останнім часом мені важко переключатися з навчання на відпочинок.' },
      { id: 'q-wl-2', text: 'Я часто відчуваю, що навчальних завдань більше, ніж можу якісно виконати.' },
      { id: 'q-wl-3', text: 'Наприкінці дня я відчуваю виснаження навіть без фізичного навантаження.' },
      { id: 'q-wl-4', text: 'Мене турбує накопичення дедлайнів та нерозвʼязаних завдань.' },
      { id: 'q-wl-5', text: 'Через навчання мені важко підтримувати комфортний режим сну й відпочинку.' }
    ],
    createdAt: '2026-03-16T09:30:00.000Z'
  }
];

function createEmptyDb() {
  return {
    meta: {
      version: 2,
      title: 'CampusPulse',
      updatedAt: new Date().toISOString()
    },
    users: [],
    checkins: [],
    resources: [],
    tests: [],
    testResults: []
  };
}

function generateId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const passwordHash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, passwordHash };
}

function verifyPassword(password, salt, storedHash) {
  const hashToCompare = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hashToCompare, 'hex'), Buffer.from(storedHash, 'hex'));
}

function ensureDirectory(targetPath) {
  if (!fs.existsSync(targetPath)) {
    fs.mkdirSync(targetPath, { recursive: true });
  }
}

function normalizeUser(rawUser) {
  return {
    id: rawUser.id || generateId('usr'),
    fullName: String(rawUser.fullName || 'Користувач').trim(),
    email: String(rawUser.email || '').trim().toLowerCase(),
    salt: rawUser.salt,
    passwordHash: rawUser.passwordHash,
    faculty: String(rawUser.faculty || '—').trim(),
    studyYear: String(rawUser.studyYear || '—').trim(),
    role: ['student', 'teacher', 'admin'].includes(rawUser.role) ? rawUser.role : 'student',
    status: rawUser.status === 'inactive' ? 'inactive' : 'active',
    createdAt: rawUser.createdAt || new Date().toISOString(),
    lastLoginAt: rawUser.lastLoginAt || null
  };
}

function upsertDefaultUser(db, account) {
  const normalizedEmail = account.email.toLowerCase();
  let existingUser = db.users.find((user) => user.email === normalizedEmail);

  if (!existingUser) {
    const { salt, passwordHash } = hashPassword(account.password);
    existingUser = normalizeUser({
      id: account.id,
      fullName: account.fullName,
      email: normalizedEmail,
      salt,
      passwordHash,
      faculty: account.faculty,
      studyYear: account.studyYear,
      role: account.role,
      status: 'active',
      createdAt: new Date().toISOString()
    });
    db.users.push(existingUser);
  } else {
    existingUser.role = account.role;
    existingUser.status = 'active';
    existingUser.faculty = existingUser.faculty || account.faculty;
    existingUser.studyYear = existingUser.studyYear || account.studyYear;
  }

  return existingUser;
}

function ensureDatabase() {
  ensureDirectory(DB_DIR);

  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(createEmptyDb(), null, 2), 'utf8');
  }

  const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  db.meta = db.meta || { version: 2, title: 'CampusPulse' };
  db.users = Array.isArray(db.users) ? db.users.map(normalizeUser) : [];
  db.checkins = Array.isArray(db.checkins) ? db.checkins : [];
  db.resources = Array.isArray(db.resources) ? db.resources : [];
  db.tests = Array.isArray(db.tests) ? db.tests : [];
  db.testResults = Array.isArray(db.testResults) ? db.testResults : [];

  const seeded = DEFAULT_ACCOUNTS.map((account) => upsertDefaultUser(db, account));
  const defaultStudent = seeded.find((user) => user.role === 'student');
  const defaultTeacher = seeded.find((user) => user.role === 'teacher');

  DEFAULT_RESOURCES.forEach((resource) => {
    if (!db.resources.find((item) => item.id === resource.id)) {
      db.resources.push(resource);
    }
  });

  DEFAULT_TESTS.forEach((test) => {
    if (!db.tests.find((item) => item.id === test.id)) {
      db.tests.push(test);
    }
  });

  if (defaultStudent && db.checkins.filter((entry) => entry.userId === defaultStudent.id).length === 0) {
    const seeds = [
      { date: '2026-03-11', mood: 7, stress: 4, energy: 7, sleepHours: 7.5, workload: 6, note: 'Стабільний день, встигла завершити лабораторну.', tags: ['лабораторна', 'ритм'] },
      { date: '2026-03-12', mood: 6, stress: 6, energy: 5, sleepHours: 6.4, workload: 8, note: 'Щільний графік, багато дедлайнів.', tags: ['дедлайн'] },
      { date: '2026-03-13', mood: 8, stress: 4, energy: 8, sleepHours: 7.9, workload: 5, note: 'Після вихідного стало легше зосереджуватися.', tags: ['відновлення'] },
      { date: '2026-03-14', mood: 7, stress: 5, energy: 6, sleepHours: 7.1, workload: 7, note: 'Нормальний темп, але потрібні короткі паузи.', tags: ['паузи'] },
      { date: '2026-03-15', mood: 8, stress: 3, energy: 8, sleepHours: 8.0, workload: 5, note: 'Добре тримався фокус і настрій.', tags: ['фокус', 'сон'] }
    ];

    seeds.forEach((entry) => {
      db.checkins.push({
        id: generateId('chk'),
        userId: defaultStudent.id,
        mood: entry.mood,
        stress: entry.stress,
        energy: entry.energy,
        sleepHours: entry.sleepHours,
        workload: entry.workload,
        note: entry.note,
        tags: entry.tags,
        date: entry.date,
        createdAt: `${entry.date}T09:00:00.000Z`
      });
    });
  }

  if (defaultStudent && db.testResults.filter((result) => result.userId === defaultStudent.id).length === 0) {
    const demoResults = [
      { testId: 'test-resource-default', answers: [4, 5, 4, 4, 5], createdAt: '2026-03-15T10:20:00.000Z' },
      { testId: 'test-load-default', answers: [3, 4, 3, 4, 2], createdAt: '2026-03-15T10:45:00.000Z' }
    ];

    demoResults.forEach((resultSeed) => {
      const test = db.tests.find((item) => item.id === resultSeed.testId);
      if (!test) return;
      const answers = test.questions.map((question, index) => ({
        questionId: question.id,
        value: resultSeed.answers[index]
      }));
      const result = buildResult(test, defaultStudent.id, answers, resultSeed.createdAt);
      db.testResults.push(result);
    });
  }

  db.meta.updatedAt = new Date().toISOString();
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
}

function readDatabase() {
  ensureDatabase();
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}

function writeDatabase(db) {
  db.meta = db.meta || {};
  db.meta.updatedAt = new Date().toISOString();
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
}

function sanitizeUser(user) {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    faculty: user.faculty,
    studyYear: user.studyYear,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt
  };
}

function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ message: 'Потрібно увійти в систему.' });
  }

  const db = readDatabase();
  const user = db.users.find((item) => item.id === req.session.userId);

  if (!user) {
    return res.status(401).json({ message: 'Користувача не знайдено.' });
  }

  if (user.status === 'inactive') {
    req.session.destroy(() => {});
    return res.status(403).json({ message: 'Обліковий запис неактивний.' });
  }

  req.database = db;
  req.currentUser = user;
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    const user = req.currentUser;

    if (!user) {
      return res.status(401).json({ message: 'Користувача не знайдено.' });
    }

    if (!roles.includes(user.role)) {
      return res.status(403).json({ message: 'Недостатньо прав для виконання дії.' });
    }

    next();
  };
}

function calculateStats(checkins) {
  const empty = {
    totalEntries: 0,
    averageMood: 0,
    averageStress: 0,
    averageEnergy: 0,
    averageSleep: 0,
    averageWorkload: 0,
    wellbeingIndex: 0,
    trend: 'Недостатньо даних',
    streak: 0
  };

  if (!checkins.length) return empty;

  const sortedAll = [...checkins].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  const sourceCheckins = sortedAll.slice(-7);

  const totals = sourceCheckins.reduce(
    (acc, item) => {
      acc.mood += Number(item.mood || 0);
      acc.stress += Number(item.stress || 0);
      acc.energy += Number(item.energy || 0);
      acc.sleep += Number(item.sleepHours || 0);
      acc.workload += Number(item.workload || 0);
      return acc;
    },
    { mood: 0, stress: 0, energy: 0, sleep: 0, workload: 0 }
  );

  const averageMood = totals.mood / sourceCheckins.length;
  const averageStress = totals.stress / sourceCheckins.length;
  const averageEnergy = totals.energy / sourceCheckins.length;
  const averageSleep = totals.sleep / sourceCheckins.length;
  const averageWorkload = totals.workload / sourceCheckins.length;

  const wellbeingIndex = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        averageMood * 2.2 +
        averageEnergy * 2.0 +
        Math.min(averageSleep, 8) * 2.0 +
        (10 - averageStress) * 2.2 +
        (10 - averageWorkload) * 1.6
      )
    )
  );

  let trend = 'Стабільний стан';
  if (wellbeingIndex >= 80) {
    trend = 'Високий ресурс';
  } else if (wellbeingIndex >= 50) {
    trend = 'Стабільний стан';
  } else {
    trend = 'Потрібна увага';
  }

  const uniqueDays = new Set(checkins.map((item) => item.date)).size;

  return {
    totalEntries: checkins.length,
    averageMood: Number(averageMood.toFixed(1)),
    averageStress: Number(averageStress.toFixed(1)),
    averageEnergy: Number(averageEnergy.toFixed(1)),
    averageSleep: Number(averageSleep.toFixed(1)),
    averageWorkload: Number(averageWorkload.toFixed(1)),
    wellbeingIndex,
    trend,
    streak: uniqueDays
  };
}

function generateRecommendations(stats) {
  if (!stats.totalEntries) {
    return [
      'Додайте перший запис у щоденник, щоб система сформувала персональні рекомендації.',
      'Фіксуйте настрій, рівень енергії, сон і навантаження хоча б кілька днів поспіль.'
    ];
  }

  const tips = [];

  if (stats.averageStress >= 6.5) {
    tips.push('Рівень стресу перевищує комфортну зону. Додай короткі паузи, мікророзминку та перерви між навчальними блоками.');
  }
  if (stats.averageSleep < 7) {
    tips.push('Сон нижче рекомендованого рівня. Спробуй стабілізувати час відходу до сну та зменшити роботу ввечері.');
  }
  if (stats.averageEnergy < 5.5) {
    tips.push('Ресурс знижений. Корисно чергувати концентрацію з короткими відновлювальними паузами протягом дня.');
  }
  if (stats.averageWorkload >= 7) {
    tips.push('Навчальне навантаження високе. Спробуй пріоритизувати задачі та розбивати їх на менші кроки.');
  }
  if (stats.averageMood >= 7 && stats.averageStress <= 5) {
    tips.push('Поточний стан стабільний. Підтримуй той самий ритм, щоб закріпити позитивну динаміку.');
  }

  if (!tips.length) {
    tips.push('Показники збалансовані. Продовжуй спостереження та підтримуй режим сну, навчання та відпочинку.');
  }

  return tips;
}

function getResultInterpretation(mode, percentage) {
  if (mode === 'risk') {
    if (percentage >= 67) {
      return {
        level: 'Високий ризик',
        summary: 'Тест показує виражені ознаки перевантаження та ризик виснаження.',
        recommendation: 'Рекомендується переглянути навантаження, додати паузи та обговорити складні ділянки навчання з викладачем або куратором.'
      };
    }
    if (percentage >= 40) {
      return {
        level: 'Помірний ризик',
        summary: 'Є ознаки напруження, але ситуацію ще можна стабілізувати за рахунок ритму роботи та відпочинку.',
        recommendation: 'Корисно скоротити фонове перевантаження, структурувати дедлайни та відстежити сон протягом найближчого тижня.'
      };
    }
    return {
      level: 'Низький ризик',
      summary: 'Ознаки перевантаження не домінують, поточний рівень напруження контрольований.',
      recommendation: 'Продовжуйте підтримувати збалансований режим і проходьте тест повторно для контролю динаміки.'
    };
  }

  if (percentage >= 67) {
    return {
      level: 'Високий ресурс',
      summary: 'Результат свідчить про добрий емоційний ресурс і стабільний внутрішній стан.',
      recommendation: 'Зберігайте поточний ритм відновлення, щоби підтримувати якісний навчальний темп без виснаження.'
    };
  }
  if (percentage >= 40) {
    return {
      level: 'Помірний ресурс',
      summary: 'Ресурс достатній, але нестабільний: у напружені періоди може просідати концентрація та витривалість.',
      recommendation: 'Додайте регулярні паузи, контроль сну та точкове зниження навантаження в пікові дні.'
    };
  }
  return {
    level: 'Низький ресурс',
    summary: 'Є ознаки виснаження або недостатнього відновлення, що може впливати на навчальну ефективність.',
    recommendation: 'Варто переглянути навантаження, режим сну та додати стабільні ритуали відновлення протягом тижня.'
  };
}

function buildResult(test, userId, answers, createdAt = new Date().toISOString()) {
  const numericAnswers = answers.map((item) => Number(item.value));

  if (test.answerType === 'custom') {
    return {
      id: generateId('res'),
      testId: test.id,
      userId,
      answers: answers.map((item) => ({
        questionId: item.questionId,
        value: Number(item.value)
      })),
      score: null,
      maxScore: null,
      percentage: null,
      level: 'Очікує оцінювання',
      summary: 'Авторський тест очікує перевірки викладачем.',
      recommendation: 'Після перегляду відповідей викладач надасть висновок.',
      reviewStatus: 'pending',
      teacherReview: '',
      teacherRecommendation: '',
      reviewedAt: null,
      reviewedBy: null,
      createdAt
    };
  }

  const score = numericAnswers.reduce((sum, value) => sum + value, 0);
  const maxScore = test.questions.length * 5;
  const percentage = maxScore ? Math.round((score / maxScore) * 100) : 0;
  const interpretation = getResultInterpretation(test.mode, percentage);

  return {
    id: generateId('res'),
    testId: test.id,
    userId,
    answers: answers.map((item) => ({
      questionId: item.questionId,
      value: Number(item.value)
    })),
    score,
    maxScore,
    percentage,
    level: interpretation.level,
    summary: interpretation.summary,
    recommendation: interpretation.recommendation,
    reviewStatus: 'auto',
    teacherReview: '',
    teacherRecommendation: '',
    reviewedAt: null,
    reviewedBy: null,
    createdAt
  };
}

function joinResult(result, db) {
  const user = db.users.find((item) => item.id === result.userId);
  const test = db.tests.find((item) => item.id === result.testId);
  return {
    ...result,
    studentName: user ? user.fullName : 'Невідомий користувач',
    studentEmail: user ? user.email : '',
    faculty: user ? user.faculty : '—',
    studyYear: user ? user.studyYear : '—',
    testTitle: test ? test.title : 'Тест видалено',
    category: test ? test.category : '—',
    mode: test ? test.mode : 'resource'
  };
}

function buildTeacherOverview(db) {
  const students = db.users.filter((user) => user.role === 'student');
  const activeTests = db.tests.filter((test) => test.status === 'active');
  const allStudentCheckins = db.checkins.filter((item) => students.some((student) => student.id === item.userId));
  const overallStats = calculateStats(allStudentCheckins);

  const studentSummaries = students
    .map((student) => {
      const userCheckins = db.checkins.filter((item) => item.userId === student.id);
      const userResults = db.testResults.filter((item) => item.userId === student.id);
      const stats = calculateStats(userCheckins);
      const lastActivity = [
        ...userCheckins.map((item) => item.createdAt),
        ...userResults.map((item) => item.createdAt)
      ]
        .sort()
        .slice(-1)[0] || student.createdAt;
      return {
        ...sanitizeUser(student),
        entries: stats.totalEntries,
        resultsCount: userResults.length,
        wellbeingIndex: stats.wellbeingIndex,
        averageMood: stats.averageMood,
        averageStress: stats.averageStress,
        lastActivity
      };
    })
    .sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity));

  const atRiskStudents = studentSummaries.filter((student) => student.wellbeingIndex > 0 && student.wellbeingIndex < 45).length;
  const engagedStudents = studentSummaries.filter((student) => student.entries > 0 || student.resultsCount > 0).length;
  const engagementRate = students.length ? Math.round((engagedStudents / students.length) * 100) : 0;

  const testAnalytics = db.tests.map((test) => {
    const results = db.testResults.filter((item) => item.testId === test.id);
    const averagePercentage = results.length
      ? Number((results.reduce((sum, item) => sum + item.percentage, 0) / results.length).toFixed(1))
      : 0;
    return {
      id: test.id,
      title: test.title,
      category: test.category,
      attempts: results.length,
      averagePercentage,
      distribution: {
        high: results.filter((item) => item.level.toLowerCase().includes('висок')).length,
        medium: results.filter((item) => item.level.toLowerCase().includes('помір')).length,
        low: results.filter((item) => item.level.toLowerCase().includes('низь')).length
      }
    };
  });

  const recentResults = db.testResults
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 8)
    .map((result) => joinResult(result, db));

  return {
    counts: {
      students: students.length,
      activeTests: activeTests.length,
      results: db.testResults.length,
      checkins: db.checkins.length,
      atRiskStudents,
      engagementRate
    },
    wellbeing: overallStats,
    studentSummaries,
    testAnalytics,
    recentResults
  };
}

function buildAdminSystem(db) {
  const roleDistribution = {
    student: db.users.filter((user) => user.role === 'student').length,
    teacher: db.users.filter((user) => user.role === 'teacher').length,
    admin: db.users.filter((user) => user.role === 'admin').length
  };

  return {
    counts: {
      users: db.users.length,
      activeUsers: db.users.filter((user) => user.status === 'active').length,
      tests: db.tests.length,
      checkins: db.checkins.length,
      results: db.testResults.length,
      resources: db.resources.length
    },
    roleDistribution,
    latestUsers: db.users
      .slice()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 8)
      .map(sanitizeUser),
    latestEvents: [
      ...db.checkins.map((entry) => ({ type: 'checkin', createdAt: entry.createdAt, label: 'Новий запис самопочуття', userId: entry.userId })),
      ...db.testResults.map((entry) => ({ type: 'result', createdAt: entry.createdAt, label: 'Нове проходження тесту', userId: entry.userId })),
      ...db.tests.map((entry) => ({ type: 'test', createdAt: entry.createdAt, label: 'Створено тест', userId: entry.createdBy }))
    ]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10)
      .map((event) => {
        const user = db.users.find((item) => item.id === event.userId);
        return {
          ...event,
          userName: user ? user.fullName : 'Система'
        };
      })
  };
}

ensureDatabase();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: 'campuspulse-local-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 3 }
  })
);
app.use(express.static(path.join(ROOT, 'public')));

app.get('/', (_, res) => res.sendFile(path.join(ROOT, 'public', 'index.html')));
app.get('/auth', (_, res) => res.sendFile(path.join(ROOT, 'public', 'auth.html')));
app.get('/dashboard', (_, res) => res.sendFile(path.join(ROOT, 'public', 'dashboard.html')));

app.get('/api/health', (_, res) => res.json({ status: 'ok', title: 'CampusPulse' }));

app.post('/api/register', (req, res) => {
  const { fullName, email, password, faculty, studyYear, role } = req.body;

  if (!fullName || !email || !password || !faculty || !studyYear) {
    return res.status(400).json({ message: 'Заповни всі обовʼязкові поля.' });
  }

  if (String(password).trim().length < 6) {
    return res.status(400).json({ message: 'Пароль має містити щонайменше 6 символів.' });
  }

  const safeRole = 'student';
  const db = readDatabase();
  const normalizedEmail = String(email).trim().toLowerCase();

  if (db.users.find((user) => user.email === normalizedEmail)) {
    return res.status(409).json({ message: 'Користувач із такою електронною адресою вже існує.' });
  }

  const { salt, passwordHash } = hashPassword(String(password));
  const user = normalizeUser({
    fullName,
    email: normalizedEmail,
    salt,
    passwordHash,
    faculty,
    studyYear,
    role: safeRole,
    status: 'active',
    createdAt: new Date().toISOString()
  });

  db.users.push(user);
  writeDatabase(db);
  req.session.userId = user.id;

  res.status(201).json({
    message: 'Обліковий запис створено.',
    user: sanitizeUser(user)
  });
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Вкажи email і пароль.' });
  }

  const db = readDatabase();
  const normalizedEmail = String(email).trim().toLowerCase();
  const user = db.users.find((item) => item.email === normalizedEmail);

  if (!user || !verifyPassword(String(password), user.salt, user.passwordHash)) {
    return res.status(401).json({ message: 'Невірний email або пароль.' });
  }

  if (user.status === 'inactive') {
    return res.status(403).json({ message: 'Обліковий запис деактивовано адміністратором.' });
  }

  user.lastLoginAt = new Date().toISOString();
  writeDatabase(db);
  req.session.userId = user.id;
  res.json({ message: 'Вхід виконано.', user: sanitizeUser(user) });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ message: 'Сеанс завершено.' });
  });
});

app.get('/api/me', requireAuth, (req, res) => {
  const db = readDatabase();
  const user = db.users.find((item) => item.id === req.session.userId);
  if (!user) {
    return res.status(404).json({ message: 'Користувача не знайдено.' });
  }

  const userCheckins = db.checkins.filter((entry) => entry.userId === user.id);
  const userResults = db.testResults.filter((entry) => entry.userId === user.id);

  res.json({
    user: sanitizeUser(user),
    profileStats: {
      checkins: userCheckins.length,
      results: userResults.length,
      wellbeing: calculateStats(userCheckins).wellbeingIndex
    }
  });
});

app.get('/api/checkins', requireAuth, requireRole('student'), (req, res) => {
  const checkins = req.database.checkins
    .filter((entry) => entry.userId === req.currentUser.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ checkins, stats: calculateStats(checkins) });
});

app.post('/api/checkins', requireAuth, requireRole('student'), (req, res) => {
  const { mood, stress, energy, sleepHours, workload, note, tags } = req.body;
  const required = [mood, stress, energy, sleepHours, workload];
  if (required.some((item) => item === undefined || item === null || item === '')) {
    return res.status(400).json({ message: 'Заповни ключові показники самопочуття.' });
  }

  const entry = {
    id: generateId('chk'),
    userId: req.currentUser.id,
    mood: Number(mood),
    stress: Number(stress),
    energy: Number(energy),
    sleepHours: Number(sleepHours),
    workload: Number(workload),
    note: String(note || '').trim(),
    tags: Array.isArray(tags)
      ? tags.filter(Boolean)
      : String(tags || '')
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
    date: new Date().toISOString().slice(0, 10),
    createdAt: new Date().toISOString()
  };

  req.database.checkins.push(entry);
  writeDatabase(req.database);

  const checkins = req.database.checkins
    .filter((item) => item.userId === req.currentUser.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const stats = calculateStats(checkins);

  res.status(201).json({
    message: 'Запис самопочуття збережено.',
    entry,
    stats,
    recommendations: generateRecommendations(stats)
  });
});

app.delete('/api/checkins/:id', requireAuth, requireRole('student'), (req, res) => {
  const initialLength = req.database.checkins.length;
  req.database.checkins = req.database.checkins.filter(
    (entry) => !(entry.id === req.params.id && entry.userId === req.currentUser.id)
  );

  if (req.database.checkins.length === initialLength) {
    return res.status(404).json({ message: 'Запис не знайдено.' });
  }

  writeDatabase(req.database);
  const checkins = req.database.checkins
    .filter((item) => item.userId === req.currentUser.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ message: 'Запис видалено.', stats: calculateStats(checkins) });
});

app.get('/api/insights', requireAuth, requireRole('student'), (req, res) => {
  const checkins = req.database.checkins
    .filter((entry) => entry.userId === req.currentUser.id)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const stats = calculateStats(checkins);
  res.json({
    stats,
    recommendations: generateRecommendations(stats),
    timeline: checkins.slice(-7).map((entry) => ({
      date: entry.date,
      mood: entry.mood,
      stress: entry.stress,
      energy: entry.energy
    })),
    summary: stats.totalEntries
      ? `Зафіксовано ${stats.totalEntries} записів. Поточний індекс стану — ${stats.wellbeingIndex}/100, тренд: ${stats.trend.toLowerCase()}.`
      : 'Ще недостатньо даних для розгорнутого аналізу.'
  });
});

app.get('/api/resources', requireAuth, (req, res) => {
  res.json({ resources: req.database.resources });
});

app.get('/api/tests', requireAuth, (req, res) => {
  const tests = req.currentUser.role === 'student'
    ? req.database.tests.filter((test) => test.status === 'active')
    : req.database.tests;

  res.json({ tests: tests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) });
});

app.post('/api/tests', requireAuth, requireRole('teacher', 'admin'), (req, res) => {
  const { title, description, category, mode, durationMinutes, questions, answerType } = req.body;

  if (!title || !description || !questions) {
    return res.status(400).json({ message: 'Вкажи назву, опис і щонайменше кілька запитань.' });
  }

  let parsedQuestions = [];

if (answerType === 'custom') {
  parsedQuestions = Array.isArray(questions)
    ? questions
        .map((item, index) => ({
          id: `${generateId('q')}-${index}`,
          text: String(item.text || '').trim(),
          options: Array.isArray(item.options)
            ? item.options
                .map((option, optionIndex) => ({
                  text: String(option.text || '').trim(),
                  value: Number(option.value || optionIndex + 1)
                }))
                .filter((option) => option.text)
            : []
        }))
        .filter((item) => item.text && item.options.length >= 2)
    : [];
} else {
  const simpleQuestions = Array.isArray(questions)
    ? questions
    : String(questions)
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

  parsedQuestions = simpleQuestions.map((questionText, index) => ({
    id: `${generateId('q')}-${index}`,
    text: questionText,
    options: []
  }));
}

if (parsedQuestions.length < 2) {
  return res.status(400).json({ message: 'Для тесту потрібно щонайменше 3 запитання.' });
}

  const test = {
    id: generateId('tst'),
    title: String(title).trim(),
    description: String(description).trim(),
    category: String(category || 'Загальний').trim(),
    mode: mode === 'risk' ? 'risk' : 'resource',
    durationMinutes: Number(durationMinutes) > 0 ? Number(durationMinutes) : 5,
    status: 'active',
    createdBy: req.currentUser.id,
    createdByName: req.currentUser.fullName,
    answerType: answerType === 'custom' ? 'custom' : 'scale',
questions: parsedQuestions,
    createdAt: new Date().toISOString()
  };

  req.database.tests.push(test);
  writeDatabase(req.database);
  res.status(201).json({ message: 'Тест додано.', test });
});

app.delete('/api/tests/:id', requireAuth, requireRole('teacher', 'admin'), (req, res) => {
  const before = req.database.tests.length;
  req.database.tests = req.database.tests.filter((test) => test.id !== req.params.id);

  if (req.database.tests.length === before) {
    return res.status(404).json({ message: 'Тест не знайдено.' });
  }

  req.database.testResults = req.database.testResults.filter((result) => result.testId !== req.params.id);
  writeDatabase(req.database);
  res.json({ message: 'Тест і повʼязані результати видалено.' });
});

app.post('/api/tests/:id/submit', requireAuth, requireRole('student'), (req, res) => {
  const test = req.database.tests.find((item) => item.id === req.params.id && item.status === 'active');
  if (!test) {
    return res.status(404).json({ message: 'Тест не знайдено або його вимкнено.' });
  }

  const rawAnswers = Array.isArray(req.body.answers) ? req.body.answers : [];
  if (rawAnswers.length !== test.questions.length) {
    return res.status(400).json({ message: 'Потрібно відповісти на всі запитання тесту.' });
  }

  const answers = test.questions.map((question) => {
    const answer = rawAnswers.find((item) => item.questionId === question.id);
    return {
      questionId: question.id,
      value: Number(answer && answer.value)
    };
  });

   const invalid = answers.some((item) => !Number.isFinite(item.value) || item.value < 1);
if (invalid) {
  return res.status(400).json({ message: 'Кожне запитання повинно мати коректну відповідь.' });
}

  const result = buildResult(test, req.currentUser.id, answers);
  req.database.testResults.push(result);
  writeDatabase(req.database);

  res.status(201).json({
    message: 'Тест успішно завершено.',
    result: joinResult(result, req.database)
  });
});

app.get('/api/results/my', requireAuth, requireRole('student'), (req, res) => {
  const results = req.database.testResults
    .filter((item) => item.userId === req.currentUser.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map((result) => joinResult(result, req.database));
  res.json({ results });
});

app.get('/api/results/all', requireAuth, requireRole('teacher', 'admin'), (req, res) => {
  const results = req.database.testResults
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map((result) => joinResult(result, req.database));
  res.json({ results });
});
app.patch('/api/results/:id/review', requireAuth, requireRole('teacher', 'admin'), (req, res) => {
  const result = req.database.testResults.find((item) => item.id === req.params.id);
  if (!result) {
    return res.status(404).json({ message: 'Результат не знайдено.' });
  }

  const test = req.database.tests.find((item) => item.id === result.testId);
  if (!test) {
    return res.status(404).json({ message: 'Тест не знайдено.' });
  }

  if (test.answerType !== 'custom') {
    return res.status(400).json({ message: 'Ручне оцінювання доступне лише для тестів із власними відповідями.' });
  }

  const { level, summary, recommendation } = req.body;

  if (!level || !summary || !recommendation) {
    return res.status(400).json({ message: 'Заповніть рівень, висновок і рекомендацію.' });
  }

  result.level = String(level).trim();
  result.summary = String(summary).trim();
  result.recommendation = String(recommendation).trim();
  result.reviewStatus = 'reviewed';
  result.teacherReview = result.summary;
  result.teacherRecommendation = result.recommendation;
  result.reviewedAt = new Date().toISOString();
  result.reviewedBy = req.currentUser.id;

  writeDatabase(req.database);

  res.json({
    message: 'Результат оцінено.',
    result: joinResult(result, req.database)
  });
});
app.get('/api/teacher/overview', requireAuth, requireRole('teacher', 'admin'), (req, res) => {
  res.json(buildTeacherOverview(req.database));
});

app.get('/api/admin/users', requireAuth, requireRole('admin'), (req, res) => {
  const users = req.database.users
    .slice()
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .map((user) => {
      const checkins = req.database.checkins.filter((entry) => entry.userId === user.id).length;
      const results = req.database.testResults.filter((entry) => entry.userId === user.id).length;
      return {
        ...sanitizeUser(user),
        checkins,
        results
      };
    });

  res.json({ users });
});

// ОНОВЛЕННЯ користувача (PATCH)
app.patch('/api/admin/users/:id', requireAuth, requireRole('admin'), (req, res) => {
  const user = req.database.users.find((item) => item.id === req.params.id);
  if (!user) {
    return res.status(404).json({ message: 'Користувача не знайдено.' });
  }

  if (user.id === req.currentUser.id) {
    return res.status(400).json({ message: 'Не можна змінювати власну роль або статус через цю форму.' });
  }

  const nextRole = req.body.role;
  const nextStatus = req.body.status;

  if (nextRole && ['student', 'teacher', 'admin'].includes(nextRole)) {
    user.role = nextRole;
  }

  if (nextStatus && ['active', 'inactive'].includes(nextStatus)) {
    user.status = nextStatus;
  }

  writeDatabase(req.database);
  res.json({ message: 'Профіль користувача оновлено.', user: sanitizeUser(user) });
});

// ВИДАЛЕННЯ користувача (DELETE) - ЦЕ ОКРЕМИЙ МАРШРУТ!
app.delete('/api/admin/users/:id', requireAuth, requireRole('admin'), (req, res) => {
  const db = req.database;
  const userId = req.params.id;
  
  const user = db.users.find(u => u.id === userId);
  
  if (!user) {
    return res.status(404).json({ message: 'Користувача не знайдено.' });
  }
  
  if (user.id === req.currentUser.id) {
    return res.status(400).json({ message: 'Не можна видалити власний обліковий запис.' });
  }
  
  db.users = db.users.filter(u => u.id !== userId);
  db.checkins = db.checkins.filter(c => c.userId !== userId);
  db.testResults = db.testResults.filter(r => r.userId !== userId);
  
  writeDatabase(db);
  
  res.json({ 
    message: `Користувача "${user.fullName}" видалено разом з усіма його даними.`,
    deletedUser: { id: user.id, fullName: user.fullName, email: user.email }
  });
});

app.get('/api/admin/system', requireAuth, requireRole('admin'), (req, res) => {
  res.json(buildAdminSystem(req.database));
});

app.listen(PORT, () => {
  console.log(`CampusPulse is running on http://localhost:${PORT}`);
});

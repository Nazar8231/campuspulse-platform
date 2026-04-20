const toastEl = document.getElementById('toast');
const toggleButtons = document.querySelectorAll('.toggle-btn');
const authCards = document.querySelectorAll('.auth-card');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const roleField = document.getElementById('role-field');
const facultyLabel = document.getElementById('faculty-label');
const studyYearLabel = document.getElementById('studyyear-label');

function showToast(message, type = 'success') {
  if (!toastEl) return;
  toastEl.textContent = message;
  toastEl.className = `toast ${type}`;
  setTimeout(() => {
    toastEl.className = 'toast hidden';
  }, 3200);
}

async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    credentials: 'same-origin',
    ...options
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || 'Сталася помилка запиту.');
  }

  return data;
}

function activateCard(targetId) {
  toggleButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.target === targetId);
  });

  authCards.forEach((card) => {
    card.classList.toggle('active', card.id === targetId);
  });
}

function syncRoleLabels() {
  if (!roleField) return;
  const isTeacher = roleField.value === 'teacher';
  if (facultyLabel) {
    facultyLabel.textContent = isTeacher ? 'Кафедра / підрозділ' : 'Факультет / спеціальність';
  }
  if (studyYearLabel) {
    studyYearLabel.textContent = isTeacher ? 'Посада' : 'Курс';
  }

  const facultyInput = registerForm?.elements?.faculty;
  const yearInput = registerForm?.elements?.studyYear;
  if (facultyInput) {
    facultyInput.placeholder = isTeacher ? 'Кафедра психології' : 'Комп\'ютерні науки';
  }
  if (yearInput) {
    yearInput.placeholder = isTeacher ? 'Викладач' : '3 курс';
  }
}

async function redirectIfAuthorized() {
  try {
    await apiRequest('/api/me');
    window.location.href = '/dashboard';
  } catch (error) {
    // not authorized
  }
}

toggleButtons.forEach((button) => {
  button.addEventListener('click', () => activateCard(button.dataset.target));
});

if (roleField) {
  roleField.addEventListener('change', syncRoleLabels);
  syncRoleLabels();
}

loginForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(loginForm);

  try {
    await apiRequest('/api/login', {
      method: 'POST',
      body: JSON.stringify(Object.fromEntries(formData.entries()))
    });
    showToast('Вхід виконано. Відкриваємо кабінет…');
    setTimeout(() => {
      window.location.href = '/dashboard';
    }, 500);
  } catch (error) {
    showToast(error.message, 'error');
  }
});

registerForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(registerForm);

  try {
    await apiRequest('/api/register', {
      method: 'POST',
      body: JSON.stringify(Object.fromEntries(formData.entries()))
    });
    showToast('Профіль створено. Відкриваємо кабінет…');
    setTimeout(() => {
      window.location.href = '/dashboard';
    }, 500);
  } catch (error) {
    showToast(error.message, 'error');
  }
});

redirectIfAuthorized();

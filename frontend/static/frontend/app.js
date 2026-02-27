const API_BASE = '/api';
const ACCOUNTS_BASE = `${API_BASE}/accounts`;
const COURSES_BASE = `${API_BASE}/courses`;
const ENROLLMENTS_BASE = `${API_BASE}/enrollments`;
const DASHBOARD_BASE = `${API_BASE}/dashboard`;

const storageKeys = {
  access: 'ocms_access_token',
  refresh: 'ocms_refresh_token',
  user: 'ocms_user',
};

function setTokens(access, refresh) {
  if (access) localStorage.setItem(storageKeys.access, access);
  if (refresh) localStorage.setItem(storageKeys.refresh, refresh);
}

function clearSession() {
  Object.values(storageKeys).forEach((k) => localStorage.removeItem(k));
}

function getAccessToken() {
  return localStorage.getItem(storageKeys.access);
}

async function fetchJSON(url, options = {}, { auth = false } = {}) {
  const headers = options.headers ? { ...options.headers } : {};
  if (!headers['Content-Type'] && options.body) {
    headers['Content-Type'] = 'application/json';
  }
  if (auth) {
    const token = getAccessToken();
    if (!token) {
      throw new Error('AUTH_REQUIRED');
    }
    headers['Authorization'] = `Bearer ${token}`;
  }
  const resp = await fetch(url, { ...options, headers });
  if (resp.status === 401) {
    throw new Error('AUTH_EXPIRED');
  }
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const detail = data.detail || data.error || JSON.stringify(data);
    throw new Error(detail);
  }
  return data;
}

function setMessage(el, text, type = '') {
  if (!el) return;
  el.textContent = text || '';
  el.classList.remove('error', 'success');
  if (type) el.classList.add(type);
}

function switchAuthTab(tabId) {
  document.querySelectorAll('.tab').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });
  document.querySelectorAll('.tab-content').forEach((el) => {
    el.classList.toggle('active', el.id === tabId);
  });
}

function showSection(sectionId) {
  document.querySelectorAll('.section').forEach((el) => {
    el.classList.toggle('active', el.id === sectionId);
  });
}

function updateNavVisibility(user) {
  const navButtons = document.querySelectorAll('.nav-link');
  navButtons.forEach((btn) => {
    const target = btn.dataset.section;
    if (target === 'courses-section') {
      btn.classList.remove('hidden');
    } else if (target === 'enrollments-section') {
      btn.classList.toggle('hidden', !user || user.role !== 'student');
    } else if (target === 'instructor-section') {
      btn.classList.toggle('hidden', !user || user.role !== 'instructor');
    } else if (target === 'admin-section') {
      btn.classList.toggle('hidden', !user || user.role !== 'admin');
    }
  });
}

async function loadCourses(page = 1) {
  const search = document.getElementById('search-input').value.trim();
  const level = document.getElementById('level-filter').value;
  const params = new URLSearchParams();
  params.set('page', page);
  if (search) params.set('search', search);
  if (level) params.set('level', level);

  try {
    const data = await fetchJSON(`${COURSES_BASE}/?${params.toString()}`);
    const listEl = document.getElementById('courses-list');
    const paginationEl = document.getElementById('courses-pagination');
    listEl.innerHTML = '';

    const user = JSON.parse(localStorage.getItem(storageKeys.user) || 'null');

    if (Array.isArray(data.results) && data.results.length) {
      data.results.forEach((course) => {
        const card = document.createElement('div');
        card.className = 'card';
        const priceBadgeClass = Number(course.price) === 0 ? 'badge price-free' : 'badge price-paid';
        const priceLabel = Number(course.price) === 0 ? 'Free' : `₹${course.price}`;
        card.innerHTML = `
          <div class="card-title">${course.title}</div>
          <div class="card-meta">${course.description || ''}</div>
          <div class="card-meta">
            <span class="badge level">${(course.level || '').toUpperCase()}</span>
            <span class="${priceBadgeClass}">${priceLabel}</span>
          </div>
          <div class="card-actions">
            ${user && user.role === 'student' ? '<button class="btn-primary small enroll-btn">Enroll</button>' : ''}
          </div>
        `;
        if (user && user.role === 'student') {
          card.querySelector('.enroll-btn').addEventListener('click', () => enrollInCourse(course.id));
        }
        listEl.appendChild(card);
      });
    } else {
      listEl.innerHTML = '<p class="card-meta">No courses found.</p>';
    }

    paginationEl.innerHTML = '';
    if (data.total_pages && data.total_pages > 1) {
      for (let p = 1; p <= data.total_pages; p++) {
        const btn = document.createElement('button');
        btn.textContent = p;
        if (p === data.current_page) btn.classList.add('active');
        btn.addEventListener('click', () => loadCourses(p));
        paginationEl.appendChild(btn);
      }
    }
  } catch (err) {
    console.error('Failed to load courses', err);
  }
}

async function enrollInCourse(courseId) {
  const user = JSON.parse(localStorage.getItem(storageKeys.user) || 'null');
  if (!user || user.role !== 'student') {
    alert('You must be logged in as a student to enroll.');
    return;
  }
  try {
    await fetchJSON(`${ENROLLMENTS_BASE}/courses/${courseId}/enroll/`, {
      method: 'POST',
      body: JSON.stringify({}),
    }, { auth: true });
    alert('Enrollment successful!');
    await loadMyEnrollments();
  } catch (err) {
    if (err.message === 'AUTH_EXPIRED' || err.message === 'AUTH_REQUIRED') {
      alert('Session expired. Please login again.');
      handleLogout();
      return;
    }
    alert(`Failed to enroll: ${err.message}`);
  }
}

async function loadMyEnrollments() {
  const listEl = document.getElementById('enrollments-list');
  listEl.innerHTML = '';
  try {
    const data = await fetchJSON(`${ENROLLMENTS_BASE}/me/`, {}, { auth: true });
    if (Array.isArray(data) && data.length) {
      data.forEach((enrollment) => {
        const card = document.createElement('div');
        card.className = 'card';
        const course = enrollment.course || {};
        card.innerHTML = `
          <div class="card-title">${course.title || 'Course #' + enrollment.course}</div>
          <div class="card-meta">Progress: ${enrollment.progress || 0}%</div>
          <div class="card-meta">${enrollment.completed ? 'Completed' : 'In Progress'}</div>
        `;
        listEl.appendChild(card);
      });
    } else {
      listEl.innerHTML = '<p class="card-meta">No enrollments yet.</p>';
    }
  } catch (err) {
    if (err.message === 'AUTH_EXPIRED' || err.message === 'AUTH_REQUIRED') {
      handleLogout();
      return;
    }
    console.error('Failed to load enrollments', err);
  }
}

async function loadDashboard() {
  try {
    const stats = await fetchJSON(`${DASHBOARD_BASE}/analytics/`, {}, { auth: true });
    document.getElementById('stat-total-users').textContent = stats.total_users ?? '-';
    document.getElementById('stat-total-courses').textContent = stats.total_courses ?? '-';
    document.getElementById('stat-total-enrollments').textContent = stats.total_enrollments ?? '-';

    const topCourses = await fetchJSON(`${DASHBOARD_BASE}/top-courses/`, {}, { auth: true });
    const listEl = document.getElementById('top-courses-list');
    listEl.innerHTML = '';
    if (Array.isArray(topCourses) && topCourses.length) {
      topCourses.forEach((c) => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
          <div class="card-title">${c.title}</div>
          <div class="card-meta">Enrollments: ${c.enrollment_count ?? '-'}</div>
        `;
        listEl.appendChild(card);
      });
    } else {
      listEl.innerHTML = '<p class="card-meta">No data yet.</p>';
    }
  } catch (err) {
    if (err.message === 'AUTH_EXPIRED' || err.message === 'AUTH_REQUIRED') {
      handleLogout();
      return;
    }
    console.error('Failed to load dashboard', err);
  }
}

async function handleLogin(event) {
  event.preventDefault();
  const form = event.target;
  const messagesEl = document.getElementById('auth-messages');
  setMessage(messagesEl, 'Logging in...', '');
  const formData = new FormData(form);
  const payload = {
    username: formData.get('username'),
    password: formData.get('password'),
  };
  try {
    const data = await fetchJSON(`${ACCOUNTS_BASE}/login/`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setTokens(data.access, data.refresh);
    await refreshUserProfile();
    setMessage(messagesEl, 'Login successful.', 'success');
    form.reset();
  } catch (err) {
    setMessage(messagesEl, `Login failed: ${err.message}`, 'error');
  }
}

async function handleRegister(event) {
  event.preventDefault();
  const form = event.target;
  const messagesEl = document.getElementById('auth-messages');
  setMessage(messagesEl, 'Creating account...', '');
  const formData = new FormData(form);
  const payload = {
    username: formData.get('username'),
    email: formData.get('email'),
    password: formData.get('password'),
    role: formData.get('role'),
  };
  try {
    await fetchJSON(`${ACCOUNTS_BASE}/register/`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setMessage(messagesEl, 'Registration successful. You can now login.', 'success');
    form.reset();
    switchAuthTab('login-tab');
  } catch (err) {
    setMessage(messagesEl, `Registration failed: ${err.message}`, 'error');
  }
}

async function handleCreateCourse(event) {
  event.preventDefault();
  const form = event.target;
  const messagesEl = document.getElementById('instructor-messages');
  setMessage(messagesEl, 'Creating course...', '');
  const formData = new FormData(form);
  const payload = {
    title: formData.get('title'),
    description: formData.get('description'),
    price: formData.get('price'),
    level: formData.get('level'),
    category: formData.get('category'),
  };
  try {
    await fetchJSON(`${COURSES_BASE}/create/`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }, { auth: true });
    setMessage(messagesEl, 'Course created successfully.', 'success');
    form.reset();
    await loadCourses();
  } catch (err) {
    if (err.message === 'AUTH_EXPIRED' || err.message === 'AUTH_REQUIRED') {
      setMessage(messagesEl, 'Session expired. Please login again.', 'error');
      handleLogout();
      return;
    }
    setMessage(messagesEl, `Failed to create course: ${err.message}`, 'error');
  }
}

function handleLogout() {
  clearSession();
  const userDisplay = document.getElementById('user-display');
  const logoutBtn = document.getElementById('logout-btn');
  userDisplay.textContent = 'Guest';
  logoutBtn.classList.add('hidden');
  updateNavVisibility(null);
}

async function refreshUserProfile() {
  try {
    const user = await fetchJSON(`${ACCOUNTS_BASE}/me/`, {}, { auth: true });
    localStorage.setItem(storageKeys.user, JSON.stringify(user));
    const userDisplay = document.getElementById('user-display');
    const logoutBtn = document.getElementById('logout-btn');
    userDisplay.textContent = `${user.username} (${user.role})`;
    logoutBtn.classList.remove('hidden');
    updateNavVisibility(user);
    if (user.role === 'student') {
      await loadMyEnrollments();
    } else if (user.role === 'admin') {
      await loadDashboard();
    }
  } catch (err) {
    handleLogout();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.tab').forEach((btn) => {
    btn.addEventListener('click', () => switchAuthTab(btn.dataset.tab));
  });

  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const createCourseForm = document.getElementById('create-course-form');
  const logoutBtn = document.getElementById('logout-btn');
  const applyFiltersBtn = document.getElementById('apply-filters-btn');

  if (loginForm) loginForm.addEventListener('submit', handleLogin);
  if (registerForm) registerForm.addEventListener('submit', handleRegister);
  if (createCourseForm) createCourseForm.addEventListener('submit', handleCreateCourse);
  if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
  if (applyFiltersBtn) applyFiltersBtn.addEventListener('click', () => loadCourses(1));

  document.querySelectorAll('.nav-link').forEach((btn) => {
    btn.addEventListener('click', () => showSection(btn.dataset.section));
  });

  loadCourses();

  const existingToken = getAccessToken();
  if (existingToken) {
    refreshUserProfile();
  } else {
    updateNavVisibility(null);
  }
});


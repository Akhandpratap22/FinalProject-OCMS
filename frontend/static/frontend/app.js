/**
 * OCMS - Online Course Management System
 * Enhanced JavaScript with loading states and improved UX
 */

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

// ============================================
// Utility Functions
// ============================================

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

// ============================================
// API Functions
// ============================================

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

// ============================================
// UI Functions
// ============================================

function showLoader() {
  const loader = document.querySelector('.loader-overlay');
  if (loader) loader.classList.add('active');
}

function hideLoader() {
  const loader = document.querySelector('.loader-overlay');
  if (loader) loader.classList.remove('active');
}

function showToast(message, type = 'info', duration = 4000) {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  
  // Trigger animation
  setTimeout(() => toast.classList.add('show'), 10);
  
  // Remove after duration
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, duration);
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
  
  // Update nav active state
  document.querySelectorAll('.nav-link').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.section === sectionId);
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

function getUserInitials(username) {
  if (!username) return '?';
  return username.substring(0, 2).toUpperCase();
}

function setButtonLoading(button, loading = true) {
  if (loading) {
    button.classList.add('btn-loading');
    button.dataset.originalText = button.textContent;
    button.textContent = 'Loading...';
    button.disabled = true;
  } else {
    button.classList.remove('btn-loading');
    button.textContent = button.dataset.originalText || button.textContent;
    button.disabled = false;
  }
}

// ============================================
// Course Functions
// ============================================

async function loadCourses(page = 1) {
  const search = document.getElementById('search-input')?.value.trim() || '';
  const level = document.getElementById('level-filter')?.value || '';
  const params = new URLSearchParams();
  params.set('page', page);
  if (search) params.set('search', search);
  if (level) params.set('level', level);

  const listEl = document.getElementById('courses-list');
  const paginationEl = document.getElementById('courses-pagination');
  
  if (listEl) {
    listEl.innerHTML = '<div class="empty-state"><p>Loading courses...</p></div>';
  }

  try {
    const data = await fetchJSON(`${COURSES_BASE}/?${params.toString()}`);
    
    if (!listEl) return;
    listEl.innerHTML = '';

    const user = JSON.parse(localStorage.getItem(storageKeys.user) || 'null');

    if (Array.isArray(data.results) && data.results.length) {
      data.results.forEach((course, index) => {
        const card = document.createElement('div');
        card.className = 'card';
        card.style.animationDelay = `${index * 0.05}s`;
        
        const priceBadgeClass = Number(course.price) === 0 ? 'badge price-free' : 'badge price-paid';
        const priceLabel = Number(course.price) === 0 ? 'Free' : `₹${course.price}`;
        
        card.innerHTML = `
          <div class="card-title">${escapeHtml(course.title)}</div>
          <div class="card-description">${escapeHtml(course.description || 'No description available')}</div>
          <div class="card-meta">
            <span class="badge level">${(course.level || '').toUpperCase()}</span>
            <span class="${priceBadgeClass}">${priceLabel}</span>
          </div>
          <div class="card-actions">
            ${user && user.role === 'student' ? `<button class="btn-primary btn-small enroll-btn">Enroll Now</button>` : ''}
            ${!user ? `<button class="btn-secondary btn-small" onclick="showToast('Please login to enroll', 'warning')">Login to Enroll</button>` : ''}
          </div>
        `;
        
        if (user && user.role === 'student') {
          card.querySelector('.enroll-btn').addEventListener('click', () => enrollInCourse(course.id));
        }
        
        listEl.appendChild(card);
      });
    } else {
      listEl.innerHTML = `
        <div class="empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <h3>No Courses Found</h3>
          <p>Try adjusting your search filters or check back later.</p>
        </div>
      `;
    }

    if (paginationEl) {
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
    }
  } catch (err) {
    console.error('Failed to load courses', err);
    if (listEl) {
      listEl.innerHTML = `
        <div class="empty-state">
          <h3>Error Loading Courses</h3>
          <p>${escapeHtml(err.message)}</p>
        </div>
      `;
    }
  }
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ============================================
// Enrollment Functions
// ============================================

async function enrollInCourse(courseId) {
  const user = JSON.parse(localStorage.getItem(storageKeys.user) || 'null');
  if (!user || user.role !== 'student') {
    showToast('You must be logged in as a student to enroll.', 'warning');
    return;
  }
  
  showLoader();
  try {
    await fetchJSON(`${ENROLLMENTS_BASE}/courses/${courseId}/enroll/`, {
      method: 'POST',
      body: JSON.stringify({}),
    }, { auth: true });
    
    showToast('Enrollment successful!', 'success');
    await loadMyEnrollments();
  } catch (err) {
    if (err.message === 'AUTH_EXPIRED' || err.message === 'AUTH_REQUIRED') {
      showToast('Session expired. Please login again.', 'error');
      handleLogout();
      return;
    }
    showToast(`Failed to enroll: ${err.message}`, 'error');
  } finally {
    hideLoader();
  }
}

async function loadMyEnrollments() {
  const listEl = document.getElementById('enrollments-list');
  if (!listEl) return;
  
  listEl.innerHTML = '<div class="empty-state"><p>Loading enrollments...</p></div>';
  
  try {
    const data = await fetchJSON(`${ENROLLMENTS_BASE}/me/`, {}, { auth: true });
    
    listEl.innerHTML = '';
    
    if (Array.isArray(data) && data.length) {
      data.forEach((enrollment, index) => {
        const card = document.createElement('div');
        card.className = 'card';
        card.style.animationDelay = `${index * 0.05}s`;
        
        const course = enrollment.course || {};
        const progress = enrollment.progress || 0;
        
        card.innerHTML = `
          <div class="card-title">${escapeHtml(course.title || 'Course #' + enrollment.course)}</div>
          <div class="card-meta">
            <span class="badge ${progress === 100 ? 'price-free' : 'level'}">${progress === 100 ? 'Completed' : 'In Progress'}</span>
            <span>Progress: ${progress}%</span>
          </div>
          <div class="card-actions">
            <button class="btn-secondary btn-small">Continue Learning</button>
          </div>
        `;
        listEl.appendChild(card);
      });
    } else {
      listEl.innerHTML = `
        <div class="empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <h3>No Enrollments Yet</h3>
          <p>Browse our courses and start learning today!</p>
        </div>
      `;
    }
  } catch (err) {
    if (err.message === 'AUTH_EXPIRED' || err.message === 'AUTH_REQUIRED') {
      handleLogout();
      return;
    }
    console.error('Failed to load enrollments', err);
    listEl.innerHTML = `<div class="empty-state"><p>Error: ${escapeHtml(err.message)}</p></div>`;
  }
}

// ============================================
// Dashboard Functions
// ============================================

async function loadDashboard() {
  try {
    showLoader();
    
    const [stats, topCourses] = await Promise.all([
      fetchJSON(`${DASHBOARD_BASE}/analytics/`, {}, { auth: true }),
      fetchJSON(`${DASHBOARD_BASE}/top-courses/`, {}, { auth: true })
    ]);

    document.getElementById('stat-total-users').textContent = stats.total_users ?? '-';
    document.getElementById('stat-total-courses').textContent = stats.total_courses ?? '-';
    document.getElementById('stat-total-enrollments').textContent = stats.total_enrollments ?? '-';

    const listEl = document.getElementById('top-courses-list');
    if (!listEl) return;
    
    listEl.innerHTML = '';
    
    if (Array.isArray(topCourses) && topCourses.length) {
      topCourses.forEach((c, index) => {
        const card = document.createElement('div');
        card.className = 'card';
        card.style.animationDelay = `${index * 0.05}s`;
        
        card.innerHTML = `
          <div class="card-title">${escapeHtml(c.title)}</div>
          <div class="card-meta">
            <span class="badge level">${c.enrollment_count ?? 0} Students</span>
          </div>
        `;
        listEl.appendChild(card);
      });
    } else {
      listEl.innerHTML = `
        <div class="empty-state">
          <h3>No Data Yet</h3>
          <p>Enrollments will appear here once students join.</p>
        </div>
      `;
    }
  } catch (err) {
    if (err.message === 'AUTH_EXPIRED' || err.message === 'AUTH_REQUIRED') {
      handleLogout();
      return;
    }
    console.error('Failed to load dashboard', err);
    showToast('Failed to load dashboard data', 'error');
  } finally {
    hideLoader();
  }
}

// ============================================
// Auth Functions
// ============================================

async function handleLogin(event) {
  event.preventDefault();
  const form = event.target;
  const messagesEl = document.getElementById('auth-messages');
  const submitBtn = form.querySelector('button[type="submit"]');
  
  setMessage(messagesEl, 'Logging in...', '');
  setButtonLoading(submitBtn, true);
  
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
    setMessage(messagesEl, 'Login successful!', 'success');
    form.reset();
    showToast('Welcome back!', 'success');
  } catch (err) {
    setMessage(messagesEl, `Login failed: ${err.message}`, 'error');
    showToast(`Login failed: ${err.message}`, 'error');
  } finally {
    setButtonLoading(submitBtn, false);
  }
}

async function handleRegister(event) {
  event.preventDefault();
  const form = event.target;
  const messagesEl = document.getElementById('auth-messages');
  const submitBtn = form.querySelector('button[type="submit"]');
  
  setMessage(messagesEl, 'Creating account...', '');
  setButtonLoading(submitBtn, true);
  
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
    
    setMessage(messagesEl, 'Registration successful! Please login.', 'success');
    showToast('Account created successfully! Please login.', 'success');
    form.reset();
    switchAuthTab('login-tab');
  } catch (err) {
    setMessage(messagesEl, `Registration failed: ${err.message}`, 'error');
    showToast(`Registration failed: ${err.message}`, 'error');
  } finally {
    setButtonLoading(submitBtn, false);
  }
}

function handleLogout() {
  clearSession();
  const userDisplay = document.getElementById('user-display');
  const logoutBtn = document.getElementById('logout-btn');
  const userAvatar = document.querySelector('.user-avatar');
  
  if (userDisplay) userDisplay.textContent = 'Guest';
  if (userAvatar) userAvatar.textContent = '?';
  if (logoutBtn) logoutBtn.classList.add('hidden');
  
  updateNavVisibility(null);
  showToast('Logged out successfully', 'success');
  
  // Reload courses for guest view
  loadCourses();
}

async function refreshUserProfile() {
  try {
    const user = await fetchJSON(`${ACCOUNTS_BASE}/me/`, {}, { auth: true });
    localStorage.setItem(storageKeys.user, JSON.stringify(user));
    
    const userDisplay = document.getElementById('user-display');
    const logoutBtn = document.getElementById('logout-btn');
    const userAvatar = document.querySelector('.user-avatar');
    
    if (userDisplay) userDisplay.textContent = `${user.username} (${user.role})`;
    if (userAvatar) userAvatar.textContent = getUserInitials(user.username);
    if (logoutBtn) logoutBtn.classList.remove('hidden');
    
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

// ============================================
// Course Creation (Instructor)
// ============================================

async function handleCreateCourse(event) {
  event.preventDefault();
  const form = event.target;
  const messagesEl = document.getElementById('instructor-messages');
  const submitBtn = form.querySelector('button[type="submit"]');
  
  setMessage(messagesEl, 'Creating course...', '');
  setButtonLoading(submitBtn, true);
  
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
    
    setMessage(messagesEl, 'Course created successfully!', 'success');
    showToast('Course created successfully!', 'success');
    form.reset();
    await loadCourses();
  } catch (err) {
    if (err.message === 'AUTH_EXPIRED' || err.message === 'AUTH_REQUIRED') {
      setMessage(messagesEl, 'Session expired. Please login again.', 'error');
      handleLogout();
      return;
    }
    setMessage(messagesEl, `Failed: ${err.message}`, 'error');
    showToast(`Failed to create course: ${err.message}`, 'error');
  } finally {
    setButtonLoading(submitBtn, false);
  }
}

// ============================================
// Event Listeners & Initialization
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  // Tab switching
  document.querySelectorAll('.tab').forEach((btn) => {
    btn.addEventListener('click', () => switchAuthTab(btn.dataset.tab));
  });

  // Form handlers
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

  // Search on Enter key
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        loadCourses(1);
      }
    });
  }

  // Navigation
  document.querySelectorAll('.nav-link').forEach((btn) => {
    btn.addEventListener('click', () => showSection(btn.dataset.section));
  });

  // Initial load
  loadCourses();

  // Check for existing session
  const existingToken = getAccessToken();
  if (existingToken) {
    refreshUserProfile();
  } else {
    updateNavVisibility(null);
  }
});

// Handle page unload warning
window.addEventListener('beforeunload', (e) => {
  // Could add warning if form has unsaved changes
});


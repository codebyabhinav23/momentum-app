/*
 * script.js - Momentum (complete, updated) — robust habit streak logic (order-independent)
 * - All dates normalized to local "YYYY-MM-DD"
 * - Habit.completed always stored as unique, sorted YMD strings
 * - Streak calculation works regardless of click order
 * - Includes auth, tasks, notes, timer, analytics scaffolding (localStorage/sessionStorage)
 */

(() => {
  'use strict';

  // -------- CONFIG --------
  const APP_ID = 'momentum-v2';
  const USERS_KEY = `momentum:${APP_ID}:users`;
  const SESSION_KEY = `momentum:${APP_ID}:session`;
  const THEME_KEY = `momentum:${APP_ID}:theme`;

  // -------- HELPERS: Storage & IDs --------
  const generateId = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

function getCurrentUsername() {
  return localStorage.getItem(SESSION_KEY); // ✅ match login()
}



  function getCurrentUserDetails() {
    const username = getCurrentUsername();
    if (!username) return null;
    const users = JSON.parse(localStorage.getItem(USERS_KEY)) || [];
    return users.find(u => u.username === username) || null;
  }
  function getUserDataKey(name) {
    const username = getCurrentUsername();
    if (!username) throw new Error('No user logged in.');
    return `momentum:${APP_ID}:${username}:${name}`;
  }
  function loadUserData(name) {
    try { return JSON.parse(localStorage.getItem(getUserDataKey(name))) || []; } catch { return []; }
  }
  function saveUserData(name, data) { localStorage.setItem(getUserDataKey(name), JSON.stringify(data)); }

  // -------- THEME --------
  function applyTheme() {
    const saved = localStorage.getItem(THEME_KEY) || 'light';
    document.documentElement.setAttribute('data-bs-theme', saved);
    updateThemeToggleIcon(saved);
  }
  function updateThemeToggleIcon(theme) {
    const el = document.getElementById('darkModeToggle');
    if (el) el.innerHTML = theme === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
  }
  function setupThemeToggle() {
    const el = document.getElementById('darkModeToggle');
    if (!el) return;
    el.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-bs-theme') || 'light';
      const next = current === 'dark' ? 'light' : 'dark';
      localStorage.setItem(THEME_KEY, next);
      document.documentElement.setAttribute('data-bs-theme', next);
      updateThemeToggleIcon(next);
    });
  }

  // -------- DATE UTILITIES (ROBUST, TIMEZONE-SAFE FIX) --------
  function toYYYYMMDD(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function dayNumber(dateInput) {
      const d = new Date(dateInput);
      const utcMidnight = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
      return Math.floor(utcMidnight / 86400000);
  }

  function normalizeHabitCompletedArray(habit) {
    if (!habit || !Array.isArray(habit.completed)) habit.completed = [];
    const normalized = habit.completed
      .map(d => {
          try { return toYYYYMMDD(new Date(d)); } catch { return null; }
      })
      .filter(Boolean);
    const uniq = Array.from(new Set(normalized));
    uniq.sort((a, b) => a.localeCompare(b));
    habit.completed = uniq;
    return habit.completed;
  }

  // -------- AUTH: simple signup/login/session --------
   function setupPasswordToggle(toggleBtnId, passwordInputId) {
        const togglePassword = document.getElementById(toggleBtnId);
        const password = document.getElementById(passwordInputId);
        if (!togglePassword || !password) return;

        togglePassword.addEventListener('click', function () {
            const type = password.getAttribute('type') === 'password' ? 'text' : 'password';
            password.setAttribute('type', type);
            this.querySelector('i').classList.toggle('fa-eye');
            this.querySelector('i').classList.toggle('fa-eye-slash');
        });
    }

  function signup(name, username, password, question, answer) {
  const users = JSON.parse(localStorage.getItem(USERS_KEY)) || [];
  if (users.some(u => u.username === username)) return { success: false, message: 'Username taken' };

  users.push({ name, username, password, question, answer });
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  return { success: true };
}

function login(username, password) {
  const users = JSON.parse(localStorage.getItem(USERS_KEY)) || [];
  const user = users.find(u => u.username === username && u.password === password);
  if (user) {
    localStorage.setItem(SESSION_KEY, username);          // existing session key
    localStorage.setItem("momentum:currentUser", username); // ✅ add this line
    return true;
  }
  return false;
}


function logout() {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem("momentum:currentUser"); // ✅ also clear old key
  window.location.href = 'login.html';
}



  // -------- STREAK LOGIC (USING THE ROBUST DAY NUMBER FIX) --------
  function calculateStreak(habit) {
    const completed = normalizeHabitCompletedArray(habit);
    if (completed.length === 0) {
        return 0;
    }

    const todayNum = dayNumber(new Date());
    const yesterdayNum = todayNum - 1;
    
    const completedNums = new Set(completed.map(dayNumber));

    let anchorNum;
    if (completedNums.has(todayNum)) {
        anchorNum = todayNum;
    } else if (completedNums.has(yesterdayNum)) {
        anchorNum = yesterdayNum;
    } else {
        return 0; // Streak is broken.
    }

    let streak = 0;
    let currentNum = anchorNum;
    while (completedNums.has(currentNum)) {
        streak++;
        currentNum--;
    }

    return streak;
  }


  // -------- PAGES --------

  // --- Login page ---
  function initLoginPage() {
    if (getCurrentUsername()) return (window.location.href = 'index.html');
    const form = document.getElementById('login-form');
    const err = document.getElementById('auth-error');
    if (!form) return;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const username = form.querySelector('#login-username').value.trim();
      const password = form.querySelector('#login-password').value;
      if (login(username, password)) {
        window.location.href = 'index.html';
      } else if (err) {
        err.textContent = 'Invalid credentials';
        err.classList.remove('d-none');
      }
    });
    setupPasswordToggle('togglePassword', 'login-password');
  }

  // --- Signup page ---
  function initSignupPage() {
    if (getCurrentUsername()) return (window.location.href = 'index.html');
    const form = document.getElementById('signup-form');
    const err = document.getElementById('auth-error');
    if (!form) return;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = form.querySelector('#signup-name').value.trim();
      const username = form.querySelector('#signup-username').value.trim();
      const password = form.querySelector('#signup-password').value;
      if (!name || !username) {
        if (err) {
          err.textContent = 'Fill all fields';
          err.classList.remove('d-none');
        }
        return;
      }
      const question = form.querySelector('#signup-question').value;
const answer = form.querySelector('#signup-answer').value.trim();
const res = signup(name, username, password, question, answer);

      if (res.success) window.location.href = 'login.html';
      else if (err) {
        err.textContent = res.message;
        err.classList.remove('d-none');
      }
    });
    setupPasswordToggle('togglePassword', 'signup-password');
  }

  // --- Dashboard (index.html) ---
  function initDashboardPage() {
    if (!getCurrentUsername()) return (window.location.href = 'login.html');
    const user = getCurrentUserDetails();
    const welcome = document.getElementById('welcomeMessage');
    if (welcome && user) welcome.textContent = `${getGreeting()}, ${user.name}.`;
    
    const quoteCard = document.getElementById('quoteCard');
    const quoteText = document.getElementById('quoteText');
    const quoteAuthor = document.getElementById('quoteAuthor');
    const quotes = [
        { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
        { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
        { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
        { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
        { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" }
    ];

    function displayQuote() {
        const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
        quoteText.textContent = `"${randomQuote.text}"`;
        quoteAuthor.textContent = `— ${randomQuote.author}`;
    }

    if (quoteCard) {
        displayQuote();
        quoteCard.addEventListener('click', displayQuote);
    }
    
    const taskCountEl = document.getElementById('taskCount');
    if(taskCountEl) taskCountEl.textContent = loadUserData('tasks').filter(t => !t.completed).length;

    const habitCountEl = document.getElementById('habitCount');
    if(habitCountEl) habitCountEl.textContent = loadUserData('habits').length;

  }

  // --- Tasks page ---
  function initTasksPage() {
    if (!getCurrentUsername()) return (window.location.href = 'login.html');
    const input = document.getElementById('taskInput');
    const addBtn = document.getElementById('addTaskBtn');
    const list = document.getElementById('taskList');
    const progressBar = document.getElementById('taskProgressBar');
    let tasks = loadUserData('tasks');

    function render() {
      list.innerHTML = '';
      if (!tasks.length) {
        list.innerHTML = '<li class="list-group-item text-center text-muted">No tasks yet</li>';
      } else {
        tasks.forEach(t => {
          const li = document.createElement('li');
          li.className = `list-group-item d-flex justify-content-between align-items-center task-item ${t.completed ? 'completed' : ''}`;
          li.dataset.id = t.id;
          li.innerHTML = `<div class="form-check"><input class="form-check-input" type="checkbox" ${t.completed ? 'checked' : ''} id="task-${t.id}"><label class="form-check-label" for="task-${t.id}">${escapeHTML(t.text)}</label></div><button class="btn btn-sm btn-outline-danger"><i class="fas fa-trash"></i></button>`;
          list.appendChild(li);
        });
      }
      const done = tasks.filter(x => x.completed).length;
      const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
      if (progressBar) {
        progressBar.style.width = pct + '%';
        progressBar.textContent = pct + '%';
      }
    }

    function addTask() {
      const text = input.value.trim();
      if (!text) return;
      tasks.unshift({ id: generateId(), text, completed: false, createdAt: new Date().toISOString() });
      saveUserData('tasks', tasks);
      input.value = '';
      render();
    }

    addBtn && addBtn.addEventListener('click', addTask);
    input && input.addEventListener('keypress', (e) => { if (e.key === 'Enter') addTask(); });

    list && list.addEventListener('click', (e) => {
      const li = e.target.closest('li');
      if (!li) return;
      const id = li.dataset.id;
      if (e.target.type === 'checkbox') {
        const t = tasks.find(x => x.id === id);
        if (t) t.completed = !t.completed;
      } else if (e.target.closest('button')) {
        tasks = tasks.filter(x => x.id !== id);
      }
      saveUserData('tasks', tasks);
      render();
    });

    render();
  }

  // --- Notes page ---
  function initNotesPage() {
    if (!getCurrentUsername()) return (window.location.href = 'login.html');
    const titleInput = document.getElementById('noteTitle');
    const contentInput = document.getElementById('noteInput');
    const addBtn = document.getElementById('addNoteBtn');
    const container = document.getElementById('notesContainer');
    let notes = loadUserData('notes');

    function render() {
      container.innerHTML = '';
      if (!notes.length) {
          container.innerHTML = '<div class="col-12 text-center text-muted mt-4"><p>No notes yet. Add one above!</p></div>';
      } else {
        notes.forEach(n => {
            const wrapper = document.createElement('div');
            wrapper.className = 'col-md-6 col-lg-4 note-card-wrapper mb-4';
            wrapper.dataset.id = n.id;
            wrapper.innerHTML = `<div class="card note-card h-100"><div class="card-body d-flex flex-column"><h5 class="note-title">${escapeHTML(n.title)}</h5><p class="card-text flex-grow-1">${escapeHTML(n.content).replace(/\n/g,'<br>')}</p></div><div class="card-footer bg-transparent d-flex justify-content-between align-items-center"><small>${new Date(n.timestamp).toLocaleDateString()}</small><button class="btn btn-sm btn-outline-danger">Delete</button></div></div>`;
            container.appendChild(wrapper);
        });
      }
    }

    if (addBtn) {
        addBtn.addEventListener('click', () => {
          const title = titleInput.value.trim();
          const content = contentInput.value.trim();
          if (!content || !title) return;
          notes.unshift({ id: generateId(), title, content, timestamp: new Date().toISOString() });
          saveUserData('notes', notes);
          titleInput.value = '';
          contentInput.value = '';
          render();
        });
    }

    if(container) {
        container.addEventListener('click', (e) => {
          if (e.target.closest('button')) {
            const id = e.target.closest('.note-card-wrapper').dataset.id;
            notes = notes.filter(n => n.id !== id);
            saveUserData('notes', notes);
            render();
          }
        });
    }
    
    render();
  }

  // --- Habits page (Today-Only) ---
  function initHabitsPage() {
    if (!getCurrentUsername()) return (window.location.href = 'login.html');
    const input = document.getElementById('habitInput');
    const addBtn = document.getElementById('addHabitBtn');
    const container = document.getElementById('habitsContainer');
    const milestoneModalEl = document.getElementById('milestoneModal');
    const milestoneModal = milestoneModalEl ? new bootstrap.Modal(milestoneModalEl) : null;
    const milestoneText = document.getElementById('milestoneText');

    let habits = loadUserData('habits') || [];
    habits.forEach(h => normalizeHabitCompletedArray(h));
    
    function render() {
        container.innerHTML = '';
        if (!habits.length) { container.innerHTML = '<p class="col-12 text-center text-muted">No habits yet.</p>'; return; }

        const todayStr = toYYYYMMDD(new Date());

        habits.forEach(h => {
            const col = document.createElement('div');
            col.className = 'col-md-6';
            col.dataset.id = h.id;
            const isCompletedToday = h.completed.includes(todayStr);

            col.innerHTML = `
                <div class="card habit-card h-100">
                    <div class="card-body habit-card-body">
                        <div>
                            <h5 class="habit-title mb-1">${escapeHTML(h.name)}</h5>
                            <p class="habit-streak mb-0">Current Streak: <strong>${calculateStreak(h)}</strong> days</p>
                        </div>
                        <div class="d-flex align-items-center">
                           <button class="btn habit-complete-btn ${isCompletedToday ? 'completed' : 'btn-outline-secondary'}" title="Mark as complete for today">
                             <i class="fas ${isCompletedToday ? 'fa-check' : 'fa-plus'}"></i>
                           </button>
                           <button class="btn btn-sm btn-outline-danger ms-2 delete-habit-btn" title="Delete Habit"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>
                </div>`;
            container.appendChild(col);
        });
    }

    addBtn && addBtn.addEventListener('click', () => {
      const name = input.value.trim();
      if (!name) return;
      const newHabit = { id: generateId(), name, completed: [] };
      habits.push(newHabit);
      saveUserData('habits', habits);
      input.value = '';
      render();
    });

    container && container.addEventListener('click', (e) => {
      const habitCard = e.target.closest('[data-id]');
      if (!habitCard) return;
      const id = habitCard.dataset.id;
      const habit = habits.find(h => h.id === id);
      if (!habit) return;
      const oldStreak = calculateStreak(habit);
      
      if (e.target.closest('.habit-complete-btn')) {
          const todayStr = toYYYYMMDD(new Date());
          const idx = habit.completed.indexOf(todayStr);
          if (idx > -1) {
              habit.completed.splice(idx, 1);
          } else {
              habit.completed.push(todayStr);
          }
          normalizeHabitCompletedArray(habit);

          const newStreak = calculateStreak(habit);
          const milestones = [3,7,14,30,60,100];
          if (newStreak > oldStreak && milestones.includes(newStreak)) {
            if (milestoneText) milestoneText.textContent = `You've kept '${habit.name}' for ${newStreak} days!`;
            if (milestoneModal) milestoneModal.show();
          }
      }
      else if (e.target.closest('.delete-habit-btn')) {
        habits = habits.filter(h => h.id !== id);
      }

      saveUserData('habits', habits);
      render();
    });

    render();
  }

  // --- Timer page (simple) ---
  function initTimerPage() {
    if (!getCurrentUsername()) return (window.location.href = 'login.html');
    const display = document.getElementById('timeDisplay');
    const startPauseBtn = document.getElementById('startPauseBtn');
    const resetBtn = document.getElementById('resetBtn');
    const pomoBtn = document.getElementById('pomoMode');
    const shortBtn = document.getElementById('shortBreakMode');
    const longBtn = document.getElementById('longBreakMode');
    const pomInput = document.getElementById('pomodoroTime');
    const shortInput = document.getElementById('shortBreakTime');
    const longInput = document.getElementById('longBreakTime');

    let timer = null, running = false;
    let mode = 'pomodoro';
    const times = {
      pomodoro: (pomInput?.value || 25) * 60,
      shortBreak: (shortInput?.value || 5) * 60,
      longBreak: (longInput?.value || 15) * 60
    };
    let total = times.pomodoro;

    function updateDisplay() {
      if (!display) return;
      const m = Math.floor(total / 60);
      const s = total % 60;
      display.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
      document.title = `${display.textContent} - Timer`;
    }

    function toggleTimer() {
        if(running) {
            pause();
        } else {
            start();
        }
    }
    
    function updateStartPauseBtn() {
        if(!startPauseBtn) return;
        if(running) {
            startPauseBtn.innerHTML = '<i class="fas fa-pause"></i> Pause';
            startPauseBtn.classList.add('btn-warning');
            startPauseBtn.classList.remove('btn-success');
        } else {
            startPauseBtn.innerHTML = '<i class="fas fa-play"></i> Start';
            startPauseBtn.classList.add('btn-success');
            startPauseBtn.classList.remove('btn-warning');
        }
    }

    function start() {
      if (running) return;
      running = true;
      updateStartPauseBtn();
      timer = setInterval(() => {
        if (total <= 0) { clearInterval(timer); running = false; alert('Session finished'); reset(); return; }
        total--; updateDisplay();
      }, 1000);
    }
    function pause() {
        clearInterval(timer); 
        running = false; 
        updateStartPauseBtn();
    }
    function reset() {
        pause(); 
        total = times[mode]; 
        updateDisplay(); 
        document.title = 'Timer - Momentum';
    }
    function switchMode(m) {
      mode = m;
      document.querySelectorAll('.timer-mode-selector .btn').forEach(b => b.classList.remove('active'));
      const mapping = { pomodoro: 'pomoMode', shortBreak: 'shortBreakMode', longBreak: 'longBreakMode' };
      const el = document.getElementById(mapping[m]);
      if (el) el.classList.add('active');
      reset();
    }

    startPauseBtn && startPauseBtn.addEventListener('click', toggleTimer);
    resetBtn && resetBtn.addEventListener('click', reset);
    pomoBtn && pomoBtn.addEventListener('click', () => switchMode('pomodoro'));
    shortBtn && shortBtn.addEventListener('click', () => switchMode('shortBreak'));
    longBtn && longBtn.addEventListener('click', () => switchMode('longBreak'));

    [pomInput, shortInput, longInput].forEach(inp => {
      if (!inp) return;
      inp.addEventListener('change', () => {
        times.pomodoro = (pomInput.value || 25) * 60;
        times.shortBreak = (shortInput.value || 5) * 60;
        times.longBreak = (longInput.value || 15) * 60;
        if (!running) reset();
      });
    });

    updateDisplay();
    updateStartPauseBtn();
  }

  // --- Analytics ---
  function initAnalyticsPage() {
    if (!getCurrentUsername()) return (window.location.href = 'login.html');
    const tasks = loadUserData('tasks');
    const habits = loadUserData('habits');

    const tasksCanvas = document.getElementById('taskChart');
    if (tasksCanvas && window.Chart) {
      const ctx = tasksCanvas.getContext('2d');
      const completed = tasks.filter(t => t.completed).length;
      new Chart(ctx, { 
          type: 'doughnut', 
          data: { 
              labels: ['Completed','Pending'], 
              datasets: [{ data: [completed, tasks.length - completed], backgroundColor:['#28a745','#ffc107'] }] 
          },
          options: {
              responsive: true,
              maintainAspectRatio: false
          }
      });
    }

    const prodCanvas = document.getElementById('productivityChart');
    if (prodCanvas && window.Chart) {
      const ctx = prodCanvas.getContext('2d');
      const labels = [], data = [];
      
      (habits || []).forEach(h => normalizeHabitCompletedArray(h));

      for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const ds = toYYYYMMDD(d);
        labels.push(d.toLocaleDateString('en-US',{weekday:'short'}));
        let count = 0;
        (habits || []).forEach(h => {
          if (h.completed.includes(ds)) count++;
        });
        data.push(count);
      }
      new Chart(ctx, { 
          type: 'bar', 
          data: { 
              labels, 
              datasets: [{ label: 'Habits completed', data, backgroundColor: 'rgba(108,92,231,0.6)' }] 
          }, 
          options: { 
              scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
              responsive: true,
              maintainAspectRatio: false
          } 
      });
    }
  }

  // --- Feedback Page ---
  function initFeedbackPage() {
      if (!getCurrentUsername()) return (window.location.href = 'login.html');
      
      const starContainer = document.querySelector('.star-rating');
      if (!starContainer) return;

      const stars = starContainer.querySelectorAll('.fa-star');
      const feedbackForm = document.getElementById('feedback-form');
      const feedbackText = document.getElementById('feedback-text');
      const feedbackStatus = document.getElementById('feedback-status');
      let currentRating = 0;

      function updateStars(rating) {
          stars.forEach(star => {
              star.classList.toggle('selected', Number(star.dataset.value) <= rating);
          });
      }

      starContainer.addEventListener('click', e => {
          if (e.target.matches('.fa-star')) {
              currentRating = Number(e.target.dataset.value);
              updateStars(currentRating);
              if (feedbackStatus) feedbackStatus.textContent = '';
          }
      });

      // Fix for mobile touch not registering star rating
starContainer.addEventListener('touchstart', e => {
    if (e.target.matches('.fa-star')) {
        e.preventDefault(); // Prevents double-trigger on some browsers
        currentRating = Number(e.target.dataset.value);
        updateStars(currentRating);
        if (feedbackStatus) feedbackStatus.textContent = '';
    }
}, { passive: false });


      starContainer.addEventListener('mouseover', e => {
          if (e.target.matches('.fa-star')) {
              updateStars(Number(e.target.dataset.value));
          }
      });

      starContainer.addEventListener('mouseout', () => {
          updateStars(currentRating);
      });

      if (feedbackForm) {
        feedbackForm.addEventListener('submit', e => {
            e.preventDefault();
            if (feedbackStatus) feedbackStatus.textContent = '';

            if (currentRating === 0) {
                if (feedbackStatus) {
                    feedbackStatus.textContent = 'Please select a star rating to submit.';
                    feedbackStatus.classList.add('text-danger');
                }
                return;
            }
            
            const user = getCurrentUserDetails();
            const subject = `Momentum Feedback: ${currentRating} Stars`;
            const body = `Rating: ${'★'.repeat(currentRating)}${'☆'.repeat(5 - currentRating)}\n\nFeedback: ${feedbackText.value}\n\nFrom: ${user.name} (${user.username})`;
            window.location.href = `mailto:momentumbyabhinav@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        });
      }
  }

  // -------- Small utilities used in many places --------
  function escapeHTML(s) { if (!s) return ''; return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }
  function getGreeting() {
    const h = new Date().getHours(); return h < 12 ? 'Good morning' : (h < 18 ? 'Good afternoon' : 'Good evening');
  }

  // -------- Initialization dispatcher --------
  function initAuthenticatedPageCommon() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', logout);
    const yearEl = document.getElementById('currentYear'); if (yearEl) yearEl.textContent = new Date().getFullYear();
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.navbar-nav .nav-link').forEach(a => { if (a.getAttribute('href') === currentPage) a.classList.add('active'); });
  }

  function initialize() {
    applyTheme();
    setupThemeToggle();
    const page = window.location.pathname.split('/').pop();

    if (page.includes('login')) initLoginPage();
    else if (page.includes('signup')) initSignupPage();
    else {
      initAuthenticatedPageCommon();

      if (page === '' || page.includes('index')) initDashboardPage();
      else if (page.includes('tasks')) initTasksPage();
      else if (page.includes('notes')) initNotesPage();
      else if (page.includes('habits')) initHabitsPage();
      else if (page.includes('timer')) initTimerPage();
      else if (page.includes('analytics')) initAnalyticsPage();
      else if (page.includes('feedback')) initFeedbackPage();
    }
  }

  document.addEventListener('DOMContentLoaded', initialize);

})();


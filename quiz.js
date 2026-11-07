// Логика викторины "Какая ты принцесса?"

let activePrincesses = typeof PRINCESSES !== 'undefined' ? PRINCESSES : {};
let activeQuestions = typeof QUESTIONS !== 'undefined' ? QUESTIONS : [];
let currentQuestionIndex = 0;
let scores = {};

// Загрузка кастомных или серверных данных викторины
async function loadQuizData() {
  // 1. Пробуем загрузить свежие данные из Supabase (если подключен)
  if (typeof fetchQuizFromSupabase === 'function') {
    try {
      const remoteData = await fetchQuizFromSupabase();
      if (remoteData && remoteData.questions && remoteData.princesses) {
        activePrincesses = remoteData.princesses;
        activeQuestions = remoteData.questions;
        localStorage.setItem('custom_quiz_data', JSON.stringify(remoteData));
        updateDynamicCounts();
        return;
      }
    } catch (e) {
      console.warn('Supabase fetch failed, fallback to local/cache:', e);
    }
  }

  // 2. Проверяем LocalStorage (кэш или данные из админки)
  const local = localStorage.getItem('custom_quiz_data');
  if (local) {
    try {
      const parsed = JSON.parse(local);
      if (parsed.princesses && parsed.questions && parsed.questions.length > 0) {
        activePrincesses = parsed.princesses;
        activeQuestions = parsed.questions;
        updateDynamicCounts();
        return;
      }
    } catch(e) {
      console.warn('Ошибка парсинга custom_quiz_data:', e);
    }
  }

  // 3. Если в LocalStorage нет, пробуем подтянуть questions.json (если выложен на хостинг)
  fetch('questions.json')
    .then(r => r.ok ? r.json() : null)
    .then(data => {
      if (data && data.princesses && data.questions) {
        activePrincesses = data.princesses;
        activeQuestions = data.questions;
        updateDynamicCounts();
      }
    })
    .catch(() => {});
}

function updateDynamicCounts() {
  const countEl = document.getElementById('welcome-q-count');
  if (countEl) countEl.innerText = activeQuestions.length;
}

// Инициализация принцесс в счете
function resetScores() {
  scores = {};
  for (let key in activePrincesses) {
    scores[key] = 0;
  }
}

// Переключение экранов
function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
  const target = document.getElementById(screenId);
  if (target) {
    target.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

// Запуск теста
function startQuiz() {
  resetScores();
  currentQuestionIndex = 0;
  showScreen('screen-quiz');
  renderQuestion();
}

// Отрисовка текущего вопроса
function renderQuestion() {
  if (!activeQuestions || activeQuestions.length === 0) {
    alert('Вопросы викторины не найдены!');
    return;
  }

  const q = activeQuestions[currentQuestionIndex];
  const total = activeQuestions.length;
  
  // Прогресс
  document.getElementById('current-q-num').innerText = currentQuestionIndex + 1;
  document.getElementById('total-q-num').innerText = total;
  const progressPercent = Math.round(((currentQuestionIndex + 1) / total) * 100);
  document.getElementById('progress-bar').style.width = progressPercent + '%';

  // Текст вопроса
  document.getElementById('question-text').innerText = q.question;
  document.getElementById('question-subtext').innerText = q.subtitle || '';

  // Картинка к вопросу (если загружена)
  const imgBox = document.getElementById('question-image-box');
  if (imgBox) {
    if (q.imageUrl) {
      imgBox.innerHTML = `<div class="question-image-wrap"><img src="${q.imageUrl}" class="question-img" alt="Иллюстрация к вопросу"></div>`;
    } else {
      imgBox.innerHTML = '';
    }
  }

  // Опции
  const optionsContainer = document.getElementById('options-list');
  optionsContainer.innerHTML = '';

  (q.options || []).forEach((opt, idx) => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.innerHTML = `
      <div class="option-indicator">${String.fromCharCode(65 + idx)}</div>
      <span>${opt.text}</span>
    `;

    btn.onclick = () => selectOption(btn, opt.scores || {});
    optionsContainer.appendChild(btn);
  });
}

// Выбор варианта ответа
function selectOption(btnElement, optionScores) {
  // Блокируем множественные клики
  const allBtns = document.querySelectorAll('.option-btn');
  allBtns.forEach(b => b.disabled = true);
  btnElement.classList.add('selected');

  // Начисляем очки
  for (let p in optionScores) {
    if (scores[p] !== undefined) {
      scores[p] += optionScores[p];
    } else {
      scores[p] = optionScores[p];
    }
  }

  // Небольшая задержка для плавности перехода
  setTimeout(() => {
    currentQuestionIndex++;
    if (currentQuestionIndex < activeQuestions.length) {
      renderQuestion();
    } else {
      finishQuiz();
    }
  }, 360);
}

// Подсчет результата и показ карточки принцессы
function finishQuiz() {
  const pKeys = Object.keys(activePrincesses);
  let bestPrincessKey = pKeys[0] || 'cinderella';
  let maxScore = -9999;

  for (let key in scores) {
    if (scores[key] > maxScore) {
      maxScore = scores[key];
      bestPrincessKey = key;
    }
  }

  const princess = activePrincesses[bestPrincessKey] || activePrincesses[pKeys[0]];
  renderResult(princess);
  showScreen('screen-result');
  launchConfetti();
}

// Отрисовка результата
function renderResult(princess) {
  if (!princess) return;

  const avatarBox = document.getElementById('result-avatar-box');
  if (avatarBox) {
    if (princess.imageUrl) {
      avatarBox.innerHTML = `<img src="${princess.imageUrl}" alt="${princess.name}">`;
    } else {
      avatarBox.innerHTML = `<span id="result-emoji">${princess.emoji || '👑'}</span>`;
    }
  }

  document.getElementById('result-name').innerText = princess.name || 'Принцесса';
  document.getElementById('result-title').innerText = princess.title || '';
  document.getElementById('result-quote').innerText = princess.quote || '';
  document.getElementById('result-desc').innerText = princess.description || '';

  // Черты характера
  const traitsContainer = document.getElementById('traits-tags');
  traitsContainer.innerHTML = '';
  (princess.traits || []).forEach(trait => {
    const span = document.createElement('span');
    span.className = 'trait-tag';
    span.innerText = '✨ ' + trait;
    traitsContainer.appendChild(span);
  });

  // Запоминаем для шеринга
  window.lastPrincessResult = princess;
}

// Поделиться / Скопировать результат
function shareResult() {
  const princess = window.lastPrincessResult;
  if (!princess) return;

  const testUrl = window.location.href.split('?')[0];
  const shareText = `👑 Мой результат в тесте «Какая ты принцесса»: Я — ${princess.name} (${princess.title || ''})!\nУзнай свою принцессу: ${testUrl}`;

  if (navigator.share) {
    navigator.share({
      title: 'Мой результат: ' + princess.name,
      text: shareText,
      url: testUrl
    }).catch(() => copyToClipboard(shareText));
  } else {
    copyToClipboard(shareText);
  }
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast('✨ Результат скопирован в буфер обмена!');
  }).catch(() => {
    showToast('Ссылка на тест: ' + window.location.href);
  });
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.innerText = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2600);
}

// Легкий генератор конфетти на Canvas
function launchConfetti() {
  const canvas = document.getElementById('confetti-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const pieces = [];
  const colors = ['#ec4899', '#8b5cf6', '#38bdf8', '#fbbf24', '#34d399', '#f43f5e'];

  for (let i = 0; i < 90; i++) {
    pieces.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      size: Math.random() * 8 + 5,
      color: colors[Math.floor(Math.random() * colors.length)],
      speedY: Math.random() * 3 + 2.5,
      speedX: (Math.random() - 0.5) * 2,
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 8
    });
  }

  let animationFrame;
  let startTime = Date.now();

  function update() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const elapsed = Date.now() - startTime;

    pieces.forEach(p => {
      p.y += p.speedY;
      p.x += p.speedX;
      p.rotation += p.rotSpeed;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      ctx.restore();
    });

    if (elapsed < 3500) {
      animationFrame = requestAnimationFrame(update);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      cancelAnimationFrame(animationFrame);
    }
  }

  update();
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
  loadQuizData();
  resetScores();
  updateDynamicCounts();
});
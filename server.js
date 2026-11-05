/**
 * Автономный легковесный сервер для викторины "Какая ты принцесса"
 * Работает на чистом Node.js БЕЗ внешних зависимостей (чистый http + fs).
 * Позволяет:
 * 1. Раздавать сайт на мобильные телефоны и экран проектора.
 * 2. Сохранять отредактированные вопросы через админку прямо в questions.json на сервере.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'questions.json');

// MIME типы для статики
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  // CORS заголовки для гибкости
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const urlPath = req.url.split('?')[0];

  // API: Получение вопросов
  if (urlPath === '/api/quiz' && req.method === 'GET') {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf-8');
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(data);
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'questions.json not created yet' }));
    }
    return;
  }

  // API: Сохранение вопросов из админ-панели
  if (urlPath === '/api/quiz' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        // Валидация JSON
        const parsed = JSON.parse(body);
        if (parsed.questions && parsed.princesses) {
          fs.writeFileSync(DATA_FILE, JSON.stringify(parsed, null, 2), 'utf-8');
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, message: 'Saved successfully' }));
          console.log(`[${new Date().toLocaleTimeString()}] Вопросы успешно обновлены через админ-панель!`);
        } else {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid quiz data structure' }));
        }
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // Раздача статических файлов
  let safePath = path.normalize(urlPath).replace(/^(\.\.[\/\\])+/, '');
  if (safePath === '/' || safePath === '\\') {
    safePath = '/index.html';
  }

  const filePath = path.join(__dirname, safePath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404: Файл не найден');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

// Определение локальных IP-адресов машины для QR-кода при локальном запуске
function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }
  return addresses;
}

server.listen(PORT, '0.0.0.0', () => {
  const localIps = getLocalIpAddresses();
  console.log('=====================================================');
  console.log(`👑 Сервер викторины успешно запущен!`);
  console.log(`📍 Локальный доступ:     http://localhost:${PORT}`);
  console.log(`📽️ Экран для проектора:  http://localhost:${PORT}/projector.html`);
  console.log(`⚙️ Панель админа:        http://localhost:${PORT}/admin.html`);
  
  if (localIps.length > 0) {
    console.log('-----------------------------------------------------');
    console.log('📲 Доступ для смартфонов зрителей в локальной сети:');
    localIps.forEach(ip => {
      console.log(`   👉 http://${ip}:${PORT}`);
    });
  }
  console.log('=====================================================');
});

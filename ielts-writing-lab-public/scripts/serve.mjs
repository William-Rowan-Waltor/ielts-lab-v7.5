import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.PORT || process.argv[2] || 5173);
const storageDir = path.join(root, 'data');
const storageFile = path.join(storageDir, 'app-state.json');

const mime = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.jsx', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp'],
]);

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data, null, 2));
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 25 * 1024 * 1024) {
        reject(new Error('Request body too large'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://localhost:${port}`);

  if (url.pathname === '/api/storage') {
    try {
      if (req.method === 'GET') {
        if (!fs.existsSync(storageFile)) {
          sendJson(res, 200, { exists: false, path: 'data/app-state.json' });
          return;
        }
        const raw = fs.readFileSync(storageFile, 'utf8');
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(raw);
        return;
      }

      if (req.method === 'POST') {
        const raw = await readRequestBody(req);
        const data = JSON.parse(raw || '{}');
        const payload = {
          ...data,
          exists: true,
          savedAt: new Date().toISOString(),
          path: 'data/app-state.json',
        };
        fs.mkdirSync(storageDir, { recursive: true });
        const tmpFile = `${storageFile}.tmp`;
        fs.writeFileSync(tmpFile, JSON.stringify(payload, null, 2), 'utf8');
        fs.renameSync(tmpFile, storageFile);
        sendJson(res, 200, { ok: true, path: 'data/app-state.json', savedAt: payload.savedAt });
        return;
      }

      sendJson(res, 405, { error: 'Method not allowed' });
    } catch (error) {
      sendJson(res, 500, { error: error.message });
    }
    return;
  }

  const requested = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname);
  const filePath = path.resolve(root, `.${requested}`);

  if (!filePath.startsWith(root)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }

    res.writeHead(200, {
      'Content-Type': mime.get(path.extname(filePath)) || 'application/octet-stream',
    });
    res.end(data);
  });
});

server.listen(port, () => {
  console.log(`IELTS Writing Lab running at http://localhost:${port}`);
  console.log(`Folder storage: ${storageFile}`);
});

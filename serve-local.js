// Zero-dependency static server for the deployed out/ build.
// Mirrors serve-out.js (port 4000, SPA fallback) but needs no npm install.
import { createServer, request as httpRequest } from 'node:http';
import { stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, 'out');
const PORT = 4000;
const API_TARGET = { host: 'localhost', port: 3001 };

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

function send(res, status, body, headers = {}) {
  res.writeHead(status, headers);
  res.end(body);
}

const server = createServer(async (req, res) => {
  try {
    // Proxy /hcgi/api → API server on :3001 (strip the /hcgi/api prefix), matching serve-out.js.
    if (req.url.startsWith('/hcgi/api')) {
      const targetPath = req.url.replace(/^\/hcgi\/api/, '') || '/';
      const proxyReq = httpRequest(
        { ...API_TARGET, method: req.method, path: targetPath, headers: req.headers },
        (proxyRes) => {
          res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
          proxyRes.pipe(res);
        },
      );
      proxyReq.on('error', () => {
        send(res, 502, JSON.stringify({ error: 'api_unreachable' }), {
          'Content-Type': 'application/json',
        });
      });
      req.pipe(proxyReq);
      return;
    }

    const urlPath = decodeURIComponent(req.url.split('?')[0]);
    let filePath = path.join(ROOT, urlPath);

    // Prevent path traversal outside ROOT.
    if (!filePath.startsWith(ROOT)) return send(res, 403, 'Forbidden');

    let info = await stat(filePath).catch(() => null);
    if (info && info.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
      info = await stat(filePath).catch(() => null);
    }

    // SPA fallback to index.html for unknown routes (no file extension).
    if (!info) {
      filePath = path.join(ROOT, 'index.html');
      info = await stat(filePath).catch(() => null);
      if (!info) return send(res, 404, 'Not found');
    }

    const type = MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type, 'Content-Length': info.size });
    createReadStream(filePath).pipe(res);
  } catch (err) {
    send(res, 500, 'Server error: ' + err.message);
  }
});

server.listen(PORT, () => {
  console.log(`Serving out/ at http://localhost:${PORT}`);
});

import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// Proxy /hcgi/api → API server on :3001
app.use('/hcgi/api', createProxyMiddleware({
  target: 'http://localhost:3001',
  changeOrigin: true,
  rewrite: (path) => path.replace(/^\/hcgi\/api/, ''),
}));

// Serve static files from out/
app.use(express.static(path.join(__dirname, 'out')));

// SPA fallback
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'out', 'index.html'));
});

app.listen(4000, () => console.log('Serving out/ at http://localhost:4000'));

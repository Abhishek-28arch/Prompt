// ============================================
// PromptCraft AI — Local Proxy Server
// Proxies requests to Ollama (local AI)
// ============================================

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';

// MIME types for static file serving
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function serveStaticFile(req, res) {
  let filePath = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  filePath = path.join(__dirname, filePath);

  // Security: prevent directory traversal
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404);
        res.end('Not Found');
      } else {
        res.writeHead(500);
        res.end('Internal Server Error');
      }
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

function proxyToOllama(req, res, ollamaPath) {
  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', () => {
    const url = new URL(ollamaPath, OLLAMA_HOST);

    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (body) {
      options.headers['Content-Length'] = Buffer.byteLength(body);
    }

    const proxyReq = http.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, {
        'Content-Type': proxyRes.headers['content-type'] || 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
      console.error('Ollama proxy error:', err.message);
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: `Cannot reach Ollama at ${OLLAMA_HOST}. Is Ollama running? Start it with: ollama serve`
      }));
    });

    if (body) proxyReq.write(body);
    proxyReq.end();
  });
}

const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Proxy routes to Ollama
  if (req.method === 'POST' && req.url === '/api/chat') {
    proxyToOllama(req, res, '/api/chat');
  } else if (req.method === 'GET' && req.url === '/api/models') {
    proxyToOllama(req, res, '/api/tags');
  } else if (req.method === 'GET' && req.url === '/api/health') {
    // Health check: try to reach Ollama
    const url = new URL('/', OLLAMA_HOST);
    const healthReq = http.request({
      hostname: url.hostname,
      port: url.port,
      path: '/',
      method: 'GET',
      timeout: 3000
    }, (healthRes) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', ollama: OLLAMA_HOST }));
    });
    healthReq.on('error', () => {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'error', message: 'Ollama not reachable' }));
    });
    healthReq.end();
  } else {
    serveStaticFile(req, res);
  }
});

server.listen(PORT, () => {
  console.log(`
  ⚡ PromptCraft AI Server
  ────────────────────────
  App:     http://localhost:${PORT}
  Ollama:  ${OLLAMA_HOST}
  
  Proxy routes:
    POST /api/chat   → Ollama chat
    GET  /api/models → Ollama model list
    GET  /api/health → Ollama health check
  
  Ready! Open your browser to get started.
  `);
});

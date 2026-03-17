import { createServer } from 'node:http';

const port = Number.parseInt(process.env.PORT || '8080', 10);

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data, null, 2));
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || '127.0.0.1'}`);

  if (req.method === 'GET' && (url.pathname === '/health' || url.pathname === '/ping')) {
    return sendJson(res, 200, {
      ok: true,
      service: 'reelforge-render-container',
      mode: process.env.RENDER_EXECUTION_MODE || 'cloudflare-container',
      note: 'This container currently exposes the render control seam and health endpoints. Full render execution migration remains intentionally deferred.',
    });
  }

  if (req.method === 'POST' && url.pathname === '/jobs/render') {
    let body = '';
    for await (const chunk of req) {
      body += chunk.toString();
    }

    let payload;
    try {
      payload = body ? JSON.parse(body) : null;
    } catch (error) {
      return sendJson(res, 400, { error: 'Invalid JSON payload' });
    }

    console.log('Received render job scaffold', payload);

    return sendJson(res, 202, {
      accepted: true,
      renderId: payload?.renderId ?? null,
      status: 'queued-for-container-migration',
      note: 'Worker and container seam is in place. Replace this stub with the real render runtime in the next migration step.',
    });
  }

  return sendJson(res, 404, { error: 'Not found' });
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Render container scaffold listening on ${port}`);
});

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
};

const server = http.createServer((req, res) => {
    // Add CORS headers for robustness
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight options request
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    let urlPath = parsedUrl.pathname;

    // Handle POST to contact form API
    if (urlPath === '/api/contact' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
            // Prevent excessively large payloads (1MB limit)
            if (body.length > 1e6) {
                res.writeHead(413, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Payload too large' }));
                req.destroy();
            }
        });

        req.on('end', () => {
            try {
                const contactData = JSON.parse(body);
                console.log('\n✉️ New Contact Message Received:');
                console.log(`👤 Name:    ${contactData.name || 'N/A'}`);
                console.log(`📧 Email:   ${contactData.email || 'N/A'}`);
                console.log(`💬 Message: ${contactData.message || 'N/A'}\n`);

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, message: 'Message received successfully!' }));
            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
            }
        });
        return;
    }

    // Handle static file serving
    if (req.method === 'GET' || req.method === 'HEAD') {
        // Normalize paths starting with /index.html/ to keep relative assets working
        if (urlPath.startsWith('/index.html/')) {
            urlPath = urlPath.replace(/^\/index.html/, '');
        }

        // Redirect trailing slash (except for root path)
        if (urlPath !== '/' && urlPath.endsWith('/')) {
            const cleanPath = urlPath.replace(/\/+$/, '');
            const redirectUrl = new URL(cleanPath || '/', parsedUrl.origin);
            redirectUrl.search = parsedUrl.search;
            res.writeHead(301, { 'Location': redirectUrl.toString() });
            res.end();
            return;
        }

        // Serve index.html for root path
        if (urlPath === '/' || urlPath === '/index.html/') {
            urlPath = '/index.html';
        }

        // Normalize trailing slash for file lookup
        let normalizedPath = urlPath;
        if (normalizedPath !== '/' && normalizedPath.endsWith('/')) {
            normalizedPath = normalizedPath.replace(/\/+$/, '');
        }

        const filePath = path.join(__dirname, normalizedPath);

        fs.stat(filePath, (err, stats) => {
            if (err || !stats.isFile()) {
                res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end(`Cannot GET ${req.url}`);
                return;
            }

            const ext = path.extname(filePath).toLowerCase();
            const contentType = MIME_TYPES[ext] || 'application/octet-stream';

            res.writeHead(200, { 'Content-Type': contentType });
            
            if (req.method === 'HEAD') {
                res.end();
                return;
            }

            const stream = fs.createReadStream(filePath);
            stream.pipe(res);

            stream.on('error', () => {
                res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end('Server Error');
            });
        });
        return;
    }

    // Default response for unhandled methods
    res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(`Method ${req.method} Not Allowed`);
});

server.listen(PORT, () => {
    console.log('\n' + '='.repeat(40));
    console.log(`🚀 Portfolio Server is Live!`);
    console.log(`🌐 URL: http://localhost:${PORT}`);
    console.log(`📂 Serving files from: ${__dirname}`);
    console.log('='.repeat(40) + '\n');
});

const express = require('express');
const https = require('https');
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise');
const basicAuth = require('express-basic-auth');

const app = express();
const PORT = process.env.HTTP_ONLY
    ? parseInt(process.env.HTTP_PORT || '3000')
    : 443;
const HTTP_PORT = 80;

// ---------- Auth (same credentials as nginx) ----------
app.use(basicAuth({
    users: { admin: process.env.ADMIN_PASSWORD || '2401154@SIT.singaporetech.edu.sg' },
    challenge: true,
    realm: 'Restricted Access'
}));

// ---------- Middleware ----------
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ---------- Validation (OWASP C3: Validate All Inputs) ----------
// Allow-list: only letters, digits, spaces, hyphens, underscores, periods
const SEARCH_PATTERN = /^[a-zA-Z0-9 _.\-]{1,100}$/;

function validateSearchTerm(term) {
    if (!term || typeof term !== 'string') return false;
    const trimmed = term.trim();
    if (trimmed.length < 1 || trimmed.length > 100) return false;
    return SEARCH_PATTERN.test(trimmed);
}

// ---------- HTML helpers ----------
function renderResult(term, queryTime) {
    const safe = sanitize(term);
    const time = queryTime || new Date().toISOString();
    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Search Result</title></head>
<body>
    <h1>Search Result</h1>
    <p>You searched for: <strong>${safe}</strong></p>
    <p>Logged at: ${time}</p>
    <a href="/"><button>Return to Home</button></a>
</body>
</html>`;
}

function sanitize(str) {
    return str.replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#x27;');
}

// ---------- DB setup ----------
async function initDb() {
    let conn;
    try {
        conn = await mysql.createConnection({
            host: process.env.DB_HOST || 'db',
            user: process.env.DB_USER || 'app',
            password: process.env.DB_PASSWORD || 'pass',
            database: process.env.DB_NAME || 'searchdb'
        });
        await conn.execute(`CREATE TABLE IF NOT EXISTS \`2401154\` (
            id INT AUTO_INCREMENT PRIMARY KEY,
            query VARCHAR(255) NOT NULL,
            query_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);
        console.log('DB table 2401154 ready');
    } catch (err) {
        console.error('DB init error:', err.message);
    } finally {
        if (conn) await conn.end();
    }
}

async function logSearch(term) {
    let conn;
    try {
        conn = await mysql.createConnection({
            host: process.env.DB_HOST || 'db',
            user: process.env.DB_USER || 'app',
            password: process.env.DB_PASSWORD || 'pass',
            database: process.env.DB_NAME || 'searchdb'
        });
        const [result] = await conn.execute('INSERT INTO `2401154` (query) VALUES (?)', [term]);
        return result.insertId;
    } catch (err) {
        console.error('DB log error:', err.message);
        return null;  // graceful fallback — don't crash the request
    } finally {
        if (conn) await conn.end();
    }
}

// ---------- Routes ----------
app.post('/search', async (req, res) => {
    const term = (req.body.search || '').trim();

    // Backend validation (C) — same C3 rules
    if (!validateSearchTerm(term)) {
        // (G) Invalid — redirect home with cleared input
        return res.redirect('/?error=1');
    }

    // (H) Valid — log to DB (I)
    const insertId = await logSearch(term);

    // Fetch timestamp for display
    let queryTime = '';
    try {
        const conn = await mysql.createConnection({
            host: process.env.DB_HOST || 'db',
            user: process.env.DB_USER || 'app',
            password: process.env.DB_PASSWORD || 'pass',
            database: process.env.DB_NAME || 'searchdb'
        });
        const [rows] = await conn.execute('SELECT query_time FROM `2401154` WHERE id = ?', [insertId]);
        if (rows.length > 0) queryTime = rows[0].query_time;
        await conn.end();
    } catch (_) { /* fallback to current time */ }

    // Show result page with timestamp
    res.send(renderResult(term, queryTime));
});

// ---------- Start server (only when run directly, not when imported for tests) ----------
if (require.main === module) {
    if (process.env.HTTP_ONLY) {
        // CI/testing mode: listen on HTTP only (no certs needed)
        initDb().then(() => {
            app.listen(PORT, () => {
                console.log(`App running in HTTP-only mode on port ${PORT}`);
            });
        }).catch(err => {
            console.error('DB init failed, starting without DB:', err.message);
            app.listen(PORT, () => {
                console.log(`App running in HTTP-only mode on port ${PORT} (no DB)`);
            });
        });
    } else {
        // Normal mode: HTTP → HTTPS redirect + HTTPS server
        const http = require('http');
        http.createServer((req, res) => {
            const host = req.headers.host ? req.headers.host.replace(/:\d+$/, '') : 'localhost';
            res.writeHead(301, { Location: `https://${host}${req.url}` });
            res.end();
        }).listen(HTTP_PORT, () => console.log('HTTP redirector on :80 → :443'));

        const sslOptions = {
            key: fs.readFileSync('/app/ssl/key.pem'),
            cert: fs.readFileSync('/app/ssl/cert.pem')
        };

        initDb().then(() => {
            https.createServer(sslOptions, app).listen(PORT, () => {
                console.log(`App running on https://localhost:${PORT}`);
            });
        });
    }
}

module.exports = { validateSearchTerm };

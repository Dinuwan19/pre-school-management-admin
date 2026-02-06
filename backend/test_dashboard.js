const http = require('http');
const jwt = require('jsonwebtoken');

const SECRET = "super_secret_key_change_me"; // From .env
const token = jwt.sign({ id: 1, role: 'SUPER_ADMIN', username: 'admin' }, SECRET);

async function getDashboard() {
    const options = {
        hostname: 'localhost',
        port: 5000,
        path: '/api/dashboard/stats',
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    };

    const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
            console.log(`Status: ${res.statusCode}`);
            console.log('--- RESPONSE ---');
            console.log(data);
            process.exit(0);
        });
    });

    req.on('error', (e) => {
        console.error(`Error: ${e.message}`);
        process.exit(1);
    });

    req.end();
}

getDashboard();

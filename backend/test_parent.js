const http = require('http');
const jwt = require('jsonwebtoken');

const SECRET = "super_secret_key_change_me"; // From .env
// Use a real parent ID if possible, but for query test a mock token might work if the DB has parent records
const token = jwt.sign({ id: 3, role: 'PARENT', username: 'parent' }, SECRET);

async function getChildren() {
    const options = {
        hostname: 'localhost',
        port: 5000,
        path: '/api/parent-auth/children',
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

getChildren();

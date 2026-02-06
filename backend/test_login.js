const http = require('http');

async function testLogin() {
    return new Promise((resolve) => {
        const postData = JSON.stringify({
            username: 'admin',
            password: 'password123' // I don't know the real password, but I want to see if it returns 401 or 500
        });

        const options = {
            hostname: 'localhost',
            port: 5000,
            path: '/api/auth/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                console.log(`Login Test | Status: ${res.statusCode}`);
                console.log(`  - Response: ${data}`);
                resolve();
            });
        });

        req.on('error', (e) => {
            console.error(`Login Test | Error: ${e.message}`);
            resolve();
        });

        req.write(postData);
        req.end();
    });
}

testLogin();

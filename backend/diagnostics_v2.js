const http = require('http');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const SECRET = process.env.JWT_SECRET || 'your-secret-key';
const token = jwt.sign({ id: 1, role: 'ADMIN', username: 'admin' }, SECRET);

const endpoints = [
    '/api/students',
    '/api/notifications',
    '/api/events',
    '/api/dashboard/stats',
    '/api/homework'
];

async function testEndpoint(path) {
    return new Promise((resolve) => {
        const options = {
            hostname: 'localhost',
            port: 5000,
            path: path,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                console.log(`Endpoint: ${path} | Status: ${res.statusCode}`);
                if (res.statusCode >= 400) {
                    console.log(`  - Error: ${data}`);
                } else if (path === '/api/students') {
                    try {
                        const students = JSON.parse(data);
                        if (students.length > 0) resolve(students[0].id);
                    } catch (e) { }
                }
                resolve();
            });
        });

        req.on('error', (e) => {
            console.error(`Endpoint: ${path} | Request Error: ${e.message}`);
            resolve();
        });
        req.end();
    });
}

async function run() {
    console.log('--- NATIVE HTTP DIAGNOSTICS ---');
    const firstStudentId = await testEndpoint('/api/students');
    if (firstStudentId) {
        await testEndpoint(`/api/students/${firstStudentId}`);
    }
    await testEndpoint('/api/notifications');
    await testEndpoint('/api/events');
    await testEndpoint('/api/dashboard/stats');
    await testEndpoint('/api/homework');
}

run();

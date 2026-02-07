const http = require('http');

const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/',
    method: 'GET'
};

const req = http.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    res.on('data', (d) => { });
    res.on('end', () => {
        console.log('Request successful!');
    });
});

req.on('error', (e) => {
    console.error(`Request failed: ${e.message}`);
});

req.end();

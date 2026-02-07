const http = require('http');

const options = {
    hostname: '172.19.56.32',
    port: 5000,
    path: '/',
    method: 'GET',
    timeout: 2000
};

console.log(`Testing connection to http://${options.hostname}:${options.port}...`);

const req = http.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    res.on('data', (d) => {
        process.stdout.write(d);
    });
    res.on('end', () => {
        console.log('\nConnection successful!');
        process.exit(0);
    });
});

req.on('timeout', () => {
    console.error('Connection timed out!');
    req.destroy();
    process.exit(1);
});

req.on('error', (e) => {
    console.error(`Connection failed: ${e.message}`);
    process.exit(1);
});

req.end();

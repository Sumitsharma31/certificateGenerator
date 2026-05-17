const http = require('http');

const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/health',
    method: 'GET'
};

const req = http.request(options, res => {
    console.log(`Backend Status Code: ${res.statusCode}`);

    res.on('data', d => {
        process.stdout.write(d);
    });
});

req.on('error', error => {
    console.error('Backend Connection Error:', error);
});

req.end();

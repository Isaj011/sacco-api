const http = require('http');

const data = JSON.stringify({
    eventType: "PASSENGER_SEATED",
    tripId: "TRIP_001",
    zoneId: "SEAT_001",
    zoneType: "SEAT",
    timestamp: 1703234567891,
    gps: {
        latitude: -1.2921,
        longitude: 36.8219,
        accuracy: 8.5
    }
});

const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/events',
    method: 'POST',
    headers: {
        'Authorization': 'Bearer demo_key_123',
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = http.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    res.on('data', (chunk) => {
        console.log('Response:', chunk.toString());
    });
});

req.on('error', (e) => {
    console.error('Error:', e.message);
});

req.write(data);
req.end();

const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:5000/api/v1';
let authToken = '';

// Test data
const testUser = {
    email: 'admin@example.com',
    password: '123456'
};

// Helper function to make authenticated requests
async function makeAuthRequest(endpoint, method = 'GET', data = null) {
    try {
        const config = {
            method,
            url: `${BASE_URL}${endpoint}`,
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        };

        if (data) {
            config.data = data;
        }

        const response = await axios(config);
        return response.data;
    } catch (error) {
        console.error(`Error calling ${endpoint}:`, error.response?.data || error.message);
        return null;
    }
}

// Test IoT fixes
async function testIoTFixes() {
    console.log('🔧 Testing IoT Fixes...\n');

    // 1. Login to get auth token
    console.log('1. Authenticating...');
    try {
        const loginResponse = await axios.post(`${BASE_URL}/auth/login`, testUser);
        authToken = loginResponse.data.token;
        console.log('✅ Authentication successful\n');
    } catch (error) {
        console.error('❌ Authentication failed:', error.response?.data || error.message);
        console.log('Please ensure you have an admin user with email: admin@example.com and password: 123456');
        return;
    }

    // 2. Test IoT data endpoint (should auto-register device now)
    console.log('2. Testing IoT data endpoint (device auto-registration)...');
    try {
        const iotData = {
            deviceId: 'test_device_new',
            location: {
                latitude: -1.2921,
                longitude: 36.8219,
                speed: 45
            },
            sensorData: {
                temperature: 25,
                fuelLevel: 80
            },
            deviceStatus: {
                batteryLevel: 90,
                signalStrength: 4
            }
        };

        const response = await axios.post(`${BASE_URL}/iot/data`, iotData, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.data.success) {
            console.log('✅ IoT data endpoint working - device auto-registered successfully');
            console.log(`   Device ID: ${response.data.data.deviceId}`);
            console.log(`   Events Generated: ${response.data.data.eventsGenerated}`);
        } else {
            console.log('❌ IoT data endpoint failed');
        }
    } catch (error) {
        console.error('❌ IoT data endpoint error:', error.response?.data || error.message);
    }

    // 3. Test GET endpoints with authorization
    console.log('\n3. Testing GET endpoints with authorization...');

    const endpoints = [
        '/iot/devices',
        '/iot/analytics',
        '/iot/alerts'
    ];

    for (const endpoint of endpoints) {
        try {
            const response = await makeAuthRequest(endpoint);
            if (response) {
                console.log(`✅ ${endpoint} - Success (count: ${response.count || 'N/A'})`);
            } else {
                console.log(`❌ ${endpoint} - Failed`);
            }
        } catch (error) {
            console.log(`❌ ${endpoint} - Error: ${error.message}`);
        }
    }

    // 4. Test device-specific endpoint
    console.log('\n4. Testing device-specific endpoint...');
    try {
        const response = await makeAuthRequest('/iot/device/test_device_new');
        if (response) {
            console.log(`✅ /iot/device/test_device_new - Success (count: ${response.count})`);
        } else {
            console.log('❌ /iot/device/test_device_new - Failed');
        }
    } catch (error) {
        console.log('❌ /iot/device/test_device_new - Error:', error.message);
    }

    console.log('\n🎉 IoT Fixes Test Complete!');
}

// Run the test
testIoTFixes().catch(console.error);

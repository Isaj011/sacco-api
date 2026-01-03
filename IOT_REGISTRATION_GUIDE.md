# IoT Registration & Complete API Endpoints Guide

## 🎯 **IoT Registration & Management**

### **📱 Device Registration**
Currently, the system uses **simple device authentication** (no formal registration needed). Devices are pre-registered in the code.

**Built-in Test Devices:**
- `demo_key_123` → Demo Bus 1
- `demo_key_456` → Demo Bus 2  
- `test_key_789` → Test Device

**Development Mode:** Any key starting with `demo_` or `test_` works!

---

## 🚀 **Complete IoT API Endpoints**

### **📊 Passenger Events API** (`/api/v1/events`)

#### **Event Ingestion:**
```
POST /api/v1/events
```
- **Purpose:** Send passenger events from IoT devices
- **Auth:** Device key required
- **Data:** Passenger event JSON
- **Response:** Success confirmation with event ID

#### **Health Check:**
```
GET /api/v1/events/health
```
- **Purpose:** Check events service status
- **Auth:** None required
- **Response:** Service health metrics

#### **Get Recent Events:**
```
GET /api/v1/events
```
- **Purpose:** Get all recent passenger events
- **Auth:** JWT token required
- **Query:** `limit`, `page`, `eventType`, `deviceId`

#### **Get Trip Events:**
```
GET /api/v1/events/trip/:tripId
```
- **Purpose:** Get all events for specific trip
- **Auth:** JWT token required
- **Query:** `limit`, `page`

#### **Trip Statistics:**
```
GET /api/v1/events/trip/:tripId/stats
```
- **Purpose:** Get analytics for specific trip
- **Auth:** JWT token required

#### **Active Trips:**
```
GET /api/v1/events/trips/active
```
- **Purpose:** Get currently active trips
- **Auth:** JWT token required
- **Query:** `hours` (default: 24)

#### **Passenger Analytics:**
```
GET /api/v1/events/analytics/passengers
```
- **Purpose:** Get passenger flow analytics
- **Auth:** JWT token required
- **Query:** `period`, `vehicleId`

---

### **🔧 Advanced IoT API** (`/api/v1/iot`)

#### **IoT Data Ingestion:**
```
POST /api/v1/iot/data
```
- **Purpose:** Send complex IoT sensor data
- **Auth:** Device key required
- **Data:** Full IoT JSON with sensors, GPS, etc.

#### **Get All Devices:**
```
GET /api/v1/iot/devices
```
- **Purpose:** List all registered IoT devices
- **Auth:** JWT token required
- **Response:** Device overview with last seen, battery, etc.

#### **Get Device Data:**
```
GET /api/v1/iot/device/:deviceId
```
- **Purpose:** Get historical data for specific device
- **Auth:** JWT token required
- **Query:** `limit`, `page`, `startDate`, `endDate`

#### **Update Device Config:**
```
PUT /api/v1/iot/device/:deviceId/config
```
- **Purpose:** Update device configuration
- **Auth:** JWT token required
- **Data:** Device settings (vehicleId, deviceType, etc.)

#### **IoT Analytics:**
```
GET /api/v1/iot/analytics
```
- **Purpose:** Get IoT system analytics
- **Auth:** JWT token required
- **Query:** `deviceId`, `vehicleId`, `period`

#### **Device Alerts:**
```
GET /api/v1/iot/alerts
```
- **Purpose:** Get device-generated alerts
- **Auth:** JWT token required
- **Query:** `deviceId`, `vehicleId`, `severity`, `type`

---

## 🔐 **Authentication Methods**

### **Device Authentication (for POST endpoints):**
```bash
# Method 1: Authorization Header
Authorization: Bearer demo_key_123

# Method 2: Device Authorization  
Authorization: Device demo_key_123

# Method 3: API Key Header
X-API-Key: demo_key_123

# Method 4: Query Parameter
?device_key=demo_key_123

# Method 5: Request Body
{
  "device_key": "demo_key_123"
}
```

### **User Authentication (for GET endpoints):**
```bash
# JWT Token from login
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 📝 **Usage Examples**

### **Send Passenger Event:**
```bash
curl -X POST http://localhost:5000/api/v1/events \
  -H "Authorization: Bearer demo_key_123" \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "PASSENGER_SEATED",
    "tripId": "TRIP_001",
    "zoneId": "SEAT_001",
    "zoneType": "SEAT",
    "timestamp": 1703234567891,
    "gps": {
      "latitude": -1.2921,
      "longitude": 36.8219,
      "accuracy": 8.5
    }
  }'
```

### **Send Complex IoT Data:**
```bash
curl -X POST http://localhost:5000/api/v1/iot/data \
  -H "Authorization: Bearer demo_key_123" \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "GPS001",
    "deviceType": "GPS_TRACKER",
    "vehicleId": "60f7b3b3b9b3b3b3b3b3b3b3",
    "location": {
      "latitude": -1.2921,
      "longitude": 38.8219,
      "speed": 45
    },
    "sensorData": {
      "temperature": 75.5,
      "fuelLevel": 85,
      "batteryVoltage": 12.6
    }
  }'
```

### **Get Device List:**
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:5000/api/v1/iot/devices
```

### **Get Trip Events:**
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:5000/api/v1/events/trip/TRIP_001
```

---

## 🎯 **Recommended IoT Registration Process**

### **Step 1: Choose Your Approach**
- **Simple:** Use built-in test devices (`demo_key_123`, etc.)
- **Advanced:** Add new devices to `middleware/simpleDeviceAuth.js`

### **Step 2: Add New Device (if needed)**
```javascript
// In middleware/simpleDeviceAuth.js
devices.set('my_device_001', { 
  id: 'my_device_001', 
  key: 'my_secret_key', 
  name: 'My Bus 1' 
});
```

### **Step 3: Test Connection**
```bash
# Test with your device key
curl -X POST http://localhost:5000/api/v1/events/health
```

### **Step 4: Start Sending Data**
Use the appropriate endpoint based on your needs:
- **Passenger Events:** `/api/v1/events` (simpler)
- **Full IoT Data:** `/api/v1/iot/data` (advanced)

---

## 📊 **Summary**

**Total IoT Endpoints:** 13
- **Passenger Events API:** 7 endpoints
- **Advanced IoT API:** 6 endpoints
- **Authentication:** Multiple methods supported
- **Data Types:** JSON, GPS, sensor data
- **Real-time:** WebSocket broadcasting included

Your IoT integration is **fully ready** for both simple passenger tracking and advanced sensor monitoring! 🚀

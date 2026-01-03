# Simple Passenger Event Integration Guide

## 🎯 **Junior Developer Friendly Setup**

This guide provides a simple, straightforward way to integrate IoT passenger tracking with your backend.

## 🚀 **Quick Start**

### **1. Send Your First Event**

**Endpoint:** `POST http://localhost:5000/api/v1/events`

**Authentication:** Simple device key (see authentication section below)

**Basic Passenger Event:**
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

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": "65a1b2c3d4e5f6789012345",
    "eventType": "PASSENGER_SEATED",
    "tripId": "TRIP_001",
    "timestamp": 1703234567891,
    "receivedAt": "2024-01-15T10:30:00.000Z",
    "deviceId": "demo_device_001"
  },
  "message": "Event received successfully"
}
```

## 📋 **Event Types You Can Send**

### **Passenger Events:**
- `PASSENGER_SEATED` - Passenger sat down
- `PASSENGER_STOOD_UP` - Passenger stood up
- `PASSENGER_BOARDED` - Passenger entered vehicle
- `PASSENGER_ALIGHTED` - Passenger exited vehicle

### **Trip Events:**
- `TRIP_STARTED` - Trip began
- `TRIP_ENDED` - Trip completed
- `STOP_REACHED` - Vehicle arrived at stop

### **Vehicle Events:**
- `DOOR_OPENED` - Vehicle door opened
- `DOOR_CLOSED` - Vehicle door closed

## 🔐 **Simple Authentication**

### **Built-in Test Devices:**
- **Device 1:** `demo_key_123` (Demo Bus 1)
- **Device 2:** `demo_key_456` (Demo Bus 2)
- **Test Device:** `test_key_789` (Test Device)

### **Authentication Methods:**

**Method 1: Authorization Header (Recommended)**
```bash
-H "Authorization: Bearer demo_key_123"
```

**Method 2: Device Authorization**
```bash
-H "Authorization: Device demo_key_123"
```

**Method 3: API Key Header**
```bash
-H "X-API-Key: demo_key_123"
```

**Method 4: Query Parameter (for testing)**
```bash
"http://localhost:5000/api/v1/events?device_key=demo_key_123"
```

**Method 5: In Request Body**
```json
{
  "eventType": "PASSENGER_SEATED",
  "tripId": "TRIP_001",
  "timestamp": 1703234567891,
  "gps": {"latitude": -1.2921, "longitude": 36.8219},
  "device_key": "demo_key_123"
}
```

### **Development Mode:**
In development, any key starting with `demo_` or `test_` will work!

## 📝 **Complete Event Examples**

### **Trip Start Event:**
```json
{
  "eventType": "TRIP_STARTED",
  "tripId": "TRIP_001",
  "timestamp": 1703234567890,
  "gps": {
    "latitude": -1.2850,
    "longitude": 36.8200,
    "accuracy": 10.0
  },
  "routeId": "ROUTE_001",
  "driverId": "DRIVER_001"
}
```

### **Passenger Seated Event:**
```json
{
  "eventType": "PASSENGER_SEATED",
  "tripId": "TRIP_001",
  "zoneId": "SEAT_001",
  "zoneType": "SEAT",
  "timestamp": 1703234567891,
  "gps": {
    "latitude": -1.2921,
    "longitude": 36.8219,
    "accuracy": 8.5
  },
  "passengerCount": 1
}
```

### **Trip End Event:**
```json
{
  "eventType": "TRIP_ENDED",
  "tripId": "TRIP_001",
  "timestamp": 1703234567894,
  "gps": {
    "latitude": -1.2965,
    "longitude": 36.8260,
    "accuracy": 11.3
  }
}
```

## 🛠 **Integration Examples**

### **Arduino/ESP32 Code:**
```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

void sendPassengerEvent(String eventType, String tripId, float latitude, float longitude) {
  HTTPClient http;
  http.begin("http://localhost:5000/api/v1/events");
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", "Bearer demo_key_123");
  
  StaticJsonDocument<300> doc;
  doc["eventType"] = eventType;
  doc["tripId"] = tripId;
  doc["timestamp"] = millis();
  
  JsonObject gps = doc.createNestedObject("gps");
  gps["latitude"] = latitude;
  gps["longitude"] = longitude;
  gps["accuracy"] = 10.0;
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  int httpResponseCode = http.POST(jsonString);
  
  if (httpResponseCode == 201) {
    Serial.println("Event sent successfully!");
  } else {
    Serial.println("Error sending event");
  }
  
  http.end();
}

// Usage
sendPassengerEvent("PASSENGER_SEATED", "TRIP_001", -1.2921, 36.8219);
```

### **Python Code:**
```python
import requests
import time

def send_passenger_event(event_type, trip_id, latitude, longitude):
    url = "http://localhost:5000/api/v1/events"
    headers = {
        "Authorization": "Bearer demo_key_123",
        "Content-Type": "application/json"
    }
    
    data = {
        "eventType": event_type,
        "tripId": trip_id,
        "timestamp": int(time.time() * 1000),
        "gps": {
            "latitude": latitude,
            "longitude": longitude,
            "accuracy": 10.0
        }
    }
    
    response = requests.post(url, headers=headers, json=data)
    return response.json()

# Usage
result = send_passenger_event("PASSENGER_SEATED", "TRIP_001", -1.2921, 36.8219)
print(result)
```

### **JavaScript/Node.js:**
```javascript
const axios = require('axios');

async function sendPassengerEvent(eventType, tripId, latitude, longitude) {
  try {
    const response = await axios.post('http://localhost:5000/api/v1/events', {
      eventType,
      tripId,
      timestamp: Date.now(),
      gps: {
        latitude,
        longitude,
        accuracy: 10.0
      }
    }, {
      headers: {
        'Authorization': 'Bearer demo_key_123',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Event sent:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

// Usage
sendPassengerEvent('PASSENGER_SEATED', 'TRIP_001', -1.2921, 36.8219);
```

## 📊 **View Your Data**

### **Health Check:**
```bash
curl http://localhost:5000/api/v1/events/health
```

### **Get Recent Events:**
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:5000/api/v1/events
```

### **Get Trip Events:**
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:5000/api/v1/events/trip/TRIP_001
```

### **Get Trip Statistics:**
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:5000/api/v1/events/trip/TRIP_001/stats
```

## 🔧 **Adding Your Own Devices**

To add a new device, edit `middleware/simpleDeviceAuth.js`:

```javascript
// Add this to the devices Map
devices.set('my_device_001', { 
  id: 'my_device_001', 
  key: 'my_secret_key', 
  name: 'My Bus 1' 
});
```

Then use: `Authorization: Bearer my_secret_key`

## ⚠️ **Common Mistakes to Avoid**

1. **Missing GPS coordinates** - Both latitude and longitude are required
2. **Invalid timestamp** - Must be a number (milliseconds since epoch)
3. **Wrong event type** - Use only the predefined event types
4. **No authentication** - Include one of the authentication methods
5. **Future timestamps** - Timestamp cannot be in the future

## 🚨 **Error Responses**

**Authentication Error (401):**
```json
{
  "success": false,
  "error": "Invalid device key",
  "hint": "Valid keys: demo_key_123, demo_key_456, test_key_789"
}
```

**Validation Error (400):**
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    "eventType is required",
    "gps.latitude is required and must be a number"
  ]
}
```

## 🎯 **Next Steps & Improvements**

### **Immediate Improvements:**
1. **Add more device types** - Edit the devices map in `simpleDeviceAuth.js`
2. **Custom event types** - Add new event types to the model enum
3. **Better validation** - Add more specific validation rules
4. **Real-time dashboard** - Create a simple web dashboard to view events

### **Advanced Features:**
1. **Database device storage** - Move devices from memory to MongoDB
2. **WebSocket real-time updates** - Already integrated, just need frontend
3. **Geofencing** - Add location-based alerts
4. **Passenger counting** - Advanced passenger flow analytics
5. **Route optimization** - Use GPS data for route planning

## 📞 **Getting Help**

1. **Check server logs** - Events are logged when received
2. **Test with health endpoint** - `GET /api/v1/events/health`
3. **Use Postman** - Import the examples to test quickly
4. **Check MongoDB** - Events are stored in `passengerevents` collection

## 🎉 **You're Ready!**

Your backend is now ready to receive passenger events from IoT devices. Start with the simple curl example above, then integrate with your actual IoT hardware.

**Server URL:** `http://localhost:5000`
**Events Endpoint:** `/api/v1/events`
**Test Device Key:** `demo_key_123`

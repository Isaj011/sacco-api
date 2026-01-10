# IoT Device-Vehicle Integration Guide

## 🎯 **Overview**

This guide transforms your backend into an **IoT-centric system** where all vehicle data, GPS tracking, and passenger events flow through IoT devices. The backend will depend primarily on IoT devices for real-time vehicle operations.

---

## 🏗️ **Architecture Overview**

### **Data Flow Architecture**
```
IoT Device → IoT Controller → Vehicle Updates → Passenger Events → Analytics
     ↓              ↓              ↓              ↓              ↓
GPS Data     →   Process     →   Update      →   Trigger     →   Reports
Sensor Data   →   Validate    →   Location    →   Events      →   Dashboard
Device Status →   Store       →   Status      →   Alerts      →   Monitoring
```

### **Core Components**
1. **Device Registration System** - Link devices to vehicles
2. **IoT Data Processing** - Handle all device data
3. **GPS Location Updates** - Real-time vehicle tracking
4. **Passenger Event Generation** - From IoT sensor data
5. **Vehicle Status Management** - Device-driven vehicle states

---

## 🔧 **1. Device-Vehicle Registration System**

### **Device Registration Endpoint**
**POST** `/api/v1/iot/devices/register`

```json
{
  "deviceId": "GPS_TRACKER_001",
  "deviceType": "MULTI_SENSOR",
  "vehicleId": "60f7b3b3b9b3b3b3b3b3b3b3",
  "deviceName": "Bus 001 GPS Tracker",
  "capabilities": [
    "GPS_TRACKING",
    "PASSENGER_COUNTING",
    "DOOR_SENSORS",
    "FUEL_MONITORING",
    "TEMPERATURE_SENSING"
  ],
  "configuration": {
    "updateInterval": 30,
    "gpsAccuracy": 10,
    "autoPassengerDetection": true,
    "geofencing": {
      "enabled": true,
      "radius": 100
    }
  }
}
```

### **Device Management Endpoints**

#### **Get All Registered Devices**
**GET** `/api/v1/iot/devices`

#### **Get Device Details**
**GET** `/api/v1/iot/devices/:deviceId`

#### **Update Device Configuration**
**PUT** `/api/v1/iot/devices/:deviceId/config`

#### **Unlink Device from Vehicle**
**DELETE** `/api/v1/iot/devices/:deviceId/unlink`

---

## 📍 **2. GPS Data Processing System**

### **GPS Data Structure**
```json
{
  "deviceId": "GPS_TRACKER_001",
  "location": {
    "latitude": -1.2921,
    "longitude": 36.8219,
    "altitude": 1700,
    "accuracy": 5.2,
    "speed": 45.5,
    "heading": 90,
    "timestamp": 1704110400000
  },
  "vehicleStatus": {
    "engineOn": true,
    "moving": true,
    "doorOpen": false
  }
}
```

### **GPS Processing Logic**
1. **Validate GPS Coordinates** - Range and accuracy checks
2. **Update Vehicle Location** - Real-time position updates
3. **Create Location History** - Track movement patterns
4. **Calculate Speed & Heading** - Movement analytics
5. **Geofence Checking** - Route compliance monitoring

---

## 🚌 **3. Passenger Event Generation from IoT**

### **IoT Sensor Data to Passenger Events**
```json
{
  "deviceId": "GPS_TRACKER_001",
  "sensorData": {
    "passengerCount": {
      "current": 12,
      "seated": 8,
      "standing": 4,
      "change": "+2"
    },
    "doorSensors": {
      "frontDoor": "closed",
      "rearDoor": "closed",
      "lastOpen": 1704110300000
    },
    "seatSensors": [
      {
        "seatId": "SEAT_001",
        "occupied": true,
        "timestamp": 1704110350000
      }
    ]
  },
  "eventType": "PASSENGER_SEATED",
  "zoneId": "SEAT_001",
  "zoneType": "SEAT"
}
```

### **Automatic Event Generation**
- **Door Open + Passenger Increase** → `PASSENGER_BOARDED`
- **Door Open + Passenger Decrease** → `PASSENGER_ALIGHTED`
- **Seat Sensor Activation** → `PASSENGER_SEATED`
- **Standing Area Detection** → `PASSENGER_STANDING`
- **Movement Start** → `TRIP_STARTED`
- **Movement End** → `TRIP_ENDED`

---

## 🔄 **4. IoT-Centric Data Flow Implementation**

### **Enhanced IoT Controller**
```javascript
// Enhanced IoT data processing
exports.receiveIoTData = asyncHandler(async (req, res, next) => {
    const { deviceId, location, sensorData, vehicleStatus } = req.body;
    
    // 1. Validate device registration
    const device = await IoT.findOne({ deviceId });
    if (!device) {
        return next(new ErrorResponse('Device not registered', 404));
    }
    
    // 2. Update vehicle location
    if (device.vehicleId && location) {
        await updateVehicleLocation(device.vehicleId, location);
    }
    
    // 3. Process sensor data
    if (sensorData) {
        await processSensorData(deviceId, sensorData);
    }
    
    // 4. Generate passenger events
    const events = await generatePassengerEvents(deviceId, sensorData);
    
    // 5. Update vehicle status
    if (vehicleStatus) {
        await updateVehicleStatus(device.vehicleId, vehicleStatus);
    }
    
    // 6. Store IoT data
    const iotData = await IoT.create({
        deviceId,
        location,
        sensorData,
        deviceStatus: vehicleStatus,
        vehicleId: device.vehicleId,
        processedEvents: events
    });
    
    // 7. Broadcast real-time updates
    await broadcastIoTUpdate(device.vehicleId, {
        location,
        sensorData,
        events,
        timestamp: new Date()
    });
    
    res.status(201).json({
        success: true,
        message: 'IoT data processed successfully',
        eventsGenerated: events.length,
        locationUpdated: !!location,
        data: iotData
    });
});
```

---

## 🚗 **5. Vehicle Model Enhancement**

### **Add Device Integration Fields**
```javascript
// Enhanced Vehicle Schema
const VehicleSchema = new mongoose.Schema({
    // ... existing fields ...
    
    // Device integration
    deviceId: {
        type: String,
        required: false,
        unique: true,
        sparse: true
    },
    deviceType: {
        type: String,
        enum: ['GPS_TRACKER', 'MULTI_SENSOR', 'ANDROID_SIMULATION'],
        required: false
    },
    deviceCapabilities: [{
        type: String,
        enum: ['GPS_TRACKING', 'PASSENGER_COUNTING', 'DOOR_SENSORS', 'FUEL_MONITORING', 'TEMPERATURE_SENSING']
    }],
    deviceConfiguration: {
        updateInterval: Number,
        gpsAccuracy: Number,
        autoPassengerDetection: Boolean,
        geofencing: {
            enabled: Boolean,
            radius: Number,
            center: {
                latitude: Number,
                longitude: Number
            }
        }
    },
    
    // IoT-driven status
    lastIoTUpdate: {
        type: Date,
        default: null
    },
    deviceStatus: {
        online: {
            type: Boolean,
            default: false
        },
        batteryLevel: {
            type: Number,
            min: 0,
            max: 100
        },
        signalStrength: {
            type: Number,
            min: 0,
            max: 5
        },
        lastSeen: Date
    },
    
    // Real-time metrics from IoT
    currentMetrics: {
        passengerCount: {
            type: Number,
            default: 0
        },
        seatedPassengers: {
            type: Number,
            default: 0
        },
        standingPassengers: {
            type: Number,
            default: 0
        },
        fuelLevel: {
            type: Number,
            min: 0,
            max: 100
        },
        engineTemperature: {
            type: Number
        },
        speed: {
            type: Number,
            default: 0
        }
    }
});
```

---

## 📱 **6. Device Registration Controller**

### **Create Device Registration Controller**
```javascript
// controllers/deviceRegistration.js
const IoT = require('../models/IoT');
const Vehicle = require('../models/Vehicle');

exports.registerDevice = asyncHandler(async (req, res, next) => {
    const { deviceId, deviceType, vehicleId, deviceName, capabilities, configuration } = req.body;
    
    // Check if device already exists
    const existingDevice = await IoT.findOne({ deviceId });
    if (existingDevice) {
        return next(new ErrorResponse('Device already registered', 400));
    }
    
    // Validate vehicle exists
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
        return next(new ErrorResponse('Vehicle not found', 404));
    }
    
    // Check if vehicle already has a device
    if (vehicle.deviceId) {
        return next(new ErrorResponse('Vehicle already has a registered device', 400));
    }
    
    // Create device registration
    const device = await IoT.create({
        deviceId,
        deviceType,
        vehicleId,
        deviceName: deviceName || `${deviceType}_${deviceId}`,
        capabilities: capabilities || [],
        configuration: configuration || {},
        deviceStatus: {
            online: false,
            batteryLevel: 100,
            signalStrength: 5,
            lastSeen: new Date()
        },
        dataSource: 'DEVICE_REGISTRATION'
    });
    
    // Update vehicle with device information
    await Vehicle.findByIdAndUpdate(vehicleId, {
        deviceId,
        deviceType,
        deviceCapabilities: capabilities || [],
        deviceConfiguration: configuration || {},
        deviceStatus: {
            online: false,
            lastSeen: new Date()
        }
    });
    
    res.status(201).json({
        success: true,
        message: 'Device registered successfully',
        data: {
            device,
            vehicle: {
                id: vehicle._id,
                plateNumber: vehicle.plateNumber,
                model: vehicle.vehicleModel
            }
        }
    });
});

exports.getRegisteredDevices = asyncHandler(async (req, res, next) => {
    const devices = await IoT.find({ vehicleId: { $exists: true } })
        .populate('vehicleId', 'plateNumber vehicleModel operationalStatus')
        .sort({ createdAt: -1 });
    
    res.status(200).json({
        success: true,
        count: devices.length,
        data: devices
    });
});
```

---

## 🔗 **7. Device-Vehicle Linking Routes**

### **Create Device Registration Routes**
```javascript
// routes/deviceRegistration.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
    registerDevice,
    getRegisteredDevices,
    updateDeviceConfig,
    unlinkDevice
} = require('../controllers/deviceRegistration');

router.route('/register')
    .post(protect, registerDevice);

router.route('/')
    .get(protect, getRegisteredDevices);

router.route('/:deviceId/config')
    .put(protect, updateDeviceConfig);

router.route('/:deviceId/unlink')
    .delete(protect, unlinkDevice);

module.exports = router;
```

---

## 📊 **8. IoT Data Processing Services**

### **GPS Location Service**
```javascript
// services/gpsLocationService.js
const Vehicle = require('../models/Vehicle');
const VehicleLocationHistory = require('../models/VehicleLocationHistory');

exports.updateVehicleLocation = async (vehicleId, location) => {
    try {
        // Update vehicle current location
        await Vehicle.findByIdAndUpdate(vehicleId, {
            currentLocation: {
                latitude: location.latitude,
                longitude: location.longitude,
                updatedAt: new Date(location.timestamp)
            },
            'currentMetrics.speed': location.speed || 0,
            lastIoTUpdate: new Date()
        });
        
        // Create location history entry
        await VehicleLocationHistory.create({
            vehicleId,
            location: {
                latitude: location.latitude,
                longitude: location.longitude,
                altitude: location.altitude,
                accuracy: location.accuracy
            },
            timestamp: new Date(location.timestamp),
            speed: {
                current: location.speed,
                heading: location.heading
            },
            dataSource: 'IOT_DEVICE'
        });
        
        console.log(`📍 Updated location for vehicle ${vehicleId}`);
    } catch (error) {
        console.error('Error updating vehicle location:', error);
    }
};
```

### **Passenger Event Generation Service**
```javascript
// services/passengerEventService.js
const PassengerEvent = require('../models/PassengerEvent');

exports.generateEventsFromSensorData = async (deviceId, sensorData) => {
    const events = [];
    
    try {
        // Get device info
        const device = await IoT.findOne({ deviceId });
        if (!device || !device.vehicleId) return events;
        
        // Process passenger count changes
        if (sensorData.passengerCount) {
            const { current, seated, standing, change } = sensorData.passengerCount;
            
            // Generate events based on changes
            if (change && change.startsWith('+')) {
                events.push({
                    eventType: 'PASSENGER_BOARDED',
                    tripId: await getCurrentTrip(device.vehicleId),
                    vehicleId: device.vehicleId,
                    passengerCount: parseInt(change.substring(1)),
                    timestamp: Date.now(),
                    gps: await getCurrentGPS(device.vehicleId),
                    deviceId
                });
            } else if (change && change.startsWith('-')) {
                events.push({
                    eventType: 'PASSENGER_ALIGHTED',
                    tripId: await getCurrentTrip(device.vehicleId),
                    vehicleId: device.vehicleId,
                    passengerCount: parseInt(change.substring(1)),
                    timestamp: Date.now(),
                    gps: await getCurrentGPS(device.vehicleId),
                    deviceId
                });
            }
        }
        
        // Process seat sensor data
        if (sensorData.seatSensors) {
            for (const seat of sensorData.seatSensors) {
                if (seat.occupied) {
                    events.push({
                        eventType: 'PASSENGER_SEATED',
                        tripId: await getCurrentTrip(device.vehicleId),
                        vehicleId: device.vehicleId,
                        zoneId: seat.seatId,
                        zoneType: 'SEAT',
                        timestamp: seat.timestamp,
                        gps: await getCurrentGPS(device.vehicleId),
                        deviceId
                    });
                }
            }
        }
        
        // Save generated events
        if (events.length > 0) {
            await PassengerEvent.insertMany(events);
            console.log(`🚌 Generated ${events.length} passenger events from device ${deviceId}`);
        }
        
        return events;
    } catch (error) {
        console.error('Error generating passenger events:', error);
        return events;
    }
};
```

---

## 🎯 **9. Implementation Steps**

### **Step 1: Update Vehicle Model**
1. Add device integration fields to Vehicle schema
2. Add IoT-driven status fields
3. Add real-time metrics fields

### **Step 2: Create Device Registration System**
1. Create device registration controller
2. Create device registration routes
3. Add device management endpoints

### **Step 3: Enhance IoT Controller**
1. Add device validation
2. Add GPS processing logic
3. Add passenger event generation
4. Add vehicle status updates

### **Step 4: Create Processing Services**
1. GPS location service
2. Passenger event service
3. Vehicle status service
4. Real-time broadcasting service

### **Step 5: Update Routes**
1. Add device registration routes
2. Update IoT routes
3. Add device management routes

---

## 📋 **10. API Endpoints Summary**

### **Device Management**
- `POST /api/v1/iot/devices/register` - Register new device
- `GET /api/v1/iot/devices` - List all registered devices
- `GET /api/v1/iot/devices/:deviceId` - Get device details
- `PUT /api/v1/iot/devices/:deviceId/config` - Update device config
- `DELETE /api/v1/iot/devices/:deviceId/unlink` - Unlink device from vehicle

### **IoT Data Ingestion**
- `POST /api/v1/iot/data` - Receive IoT data (enhanced)
- `POST /api/v1/iot/data/batch` - Batch IoT data
- `GET /api/v1/iot/data/device/:deviceId` - Get device data history

### **Vehicle IoT Status**
- `GET /api/v1/vehicles/:vehicleId/iot-status` - Get vehicle IoT status
- `GET /api/v1/vehicles/:vehicleId/location-history` - Get location history
- `GET /api/v1/vehicles/iot-active` - Get vehicles with active IoT devices

---

## 🔧 **11. Configuration**

### **Environment Variables**
```env
# IoT Configuration
IOT_UPDATE_INTERVAL=30
GPS_ACCURACY_THRESHOLD=10
DEVICE_TIMEOUT_MINUTES=5
AUTO_PASSENGER_DETECTION=true
GEOFENCING_ENABLED=true
GEOFENCE_RADIUS_METERS=100

# Real-time Broadcasting
WEBSOCKET_ENABLED=true
BROADCAST_IOT_UPDATES=true
BROADCAST_PASSENGER_EVENTS=true
```

---

## 🚀 **12. Testing the Integration**

### **Test Device Registration**
```bash
curl -X POST http://localhost:5000/api/v1/iot/devices/register \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "GPS_TRACKER_001",
    "deviceType": "MULTI_SENSOR",
    "vehicleId": "60f7b3b3b9b3b3b3b3b3b3b3",
    "deviceName": "Bus 001 GPS Tracker",
    "capabilities": ["GPS_TRACKING", "PASSENGER_COUNTING"],
    "configuration": {
      "updateInterval": 30,
      "gpsAccuracy": 10
    }
  }'
```

### **Test IoT Data Ingestion**
```bash
curl -X POST http://localhost:5000/api/v1/iot/data \
  -H "Authorization: Device GPS_TRACKER_001" \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "GPS_TRACKER_001",
    "location": {
      "latitude": -1.2921,
      "longitude": 36.8219,
      "speed": 45,
      "heading": 90,
      "timestamp": 1704110400000
    },
    "sensorData": {
      "passengerCount": {
        "current": 12,
        "seated": 8,
        "standing": 4,
        "change": "+2"
      },
      "fuelLevel": 75,
      "engineTemperature": 85
    },
    "vehicleStatus": {
      "engineOn": true,
      "moving": true,
      "doorOpen": false
    }
  }'
```

---

## 🎉 **13. Benefits of IoT-Centric System**

### **Real-time Operations**
- Live GPS tracking
- Automatic passenger counting
- Real-time vehicle status
- Instant alerts and notifications

### **Data Accuracy**
- Sensor-based passenger detection
- Precise GPS location tracking
- Automated event generation
- Reduced manual data entry

### **Operational Efficiency**
- Automated fleet management
- Predictive maintenance alerts
- Route optimization
- Fuel consumption monitoring

### **Scalability**
- Easy device addition
- Centralized data management
- Standardized data formats
- Flexible device types

---

## 📞 **14. Support and Monitoring**

### **Device Health Monitoring**
- Battery level tracking
- Signal strength monitoring
- Connection status
- Data quality checks

### **System Monitoring**
- IoT data processing metrics
- Event generation rates
- Location update frequency
- Error tracking and alerts

This guide transforms your backend into a fully IoT-centric system where all vehicle operations depend on real-time device data for accurate, automated fleet management.

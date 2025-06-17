# Background Job System for Vehicle Location Tracking

This document explains how the background job system integrates with your existing Sacco API application, including CRUD operations for vehicles, routes/courses, drivers, and the seeder system.

## 🎯 Integration Overview

The background job system is **fully compatible** with your existing application structure:

### ✅ **Compatible Components**

- **Vehicle CRUD** - Uses existing vehicle data structure (`plateNumber`, `vehicleModel`, `seatingCapacity`, etc.)
- **Course/Route CRUD** - Integrates with assigned routes and stops
- **Driver CRUD** - Works with driver assignments and vehicle relationships
- **Seeder System** - Compatible with existing `seeder.js` data structure
- **LocationTriggerService** - Evaluates triggers based on vehicle data
- **VehicleLocationHistory** - Stores comprehensive location and trigger history

### 🔄 **Data Flow Integration**

```
Seeder Data (seeder.js)
    ↓
Vehicle/Course/Driver Relationships
    ↓
Background Job System
    ↓
LocationTriggerService
    ↓
VehicleLocationHistory
    ↓
Real-time Updates to Vehicle Stats
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install node-cron
```

### 2. Seed Your Data (if not already done)

```bash
npm run seed
```

### 3. Create Location Triggers

```bash
npm run seed:triggers
```

### 4. Test the System

```bash
npm run test:background
```

### 5. Start the API Server

```bash
npm run dev
```

### 6. Control Background Jobs via API

```bash
# Initialize
curl -X POST http://localhost:5000/api/v1/background-jobs/initialize

# Start simulation
curl -X POST http://localhost:5000/api/v1/background-jobs/start-simulation

# Check status
curl http://localhost:5000/api/v1/background-jobs/status
```

## 📊 Data Structure Compatibility

### Vehicle Data Integration

The system works with your existing vehicle structure from `_data/vehicles.json`:

```json
{
  "plateNumber": "KAA 001A",
  "vehicleModel": "Toyota Hiace",
  "seatingCapacity": 33,
  "averageSpeed": 40,
  "currentLocation": { "latitude": -1.2921, "longitude": 36.8219 },
  "assignedRoute": "course_id",
  "currentDriver": "driver_id",
  "status": "in_use"
}
```

**Background Job Updates:**

- ✅ `currentLocation` - Updated every 30 seconds
- ✅ `currentSpeed` - Real-time speed simulation
- ✅ `averageSpeed` - Calculated from simulation data
- ✅ `totalPassengersFerried` - Incremented on stop arrivals
- ✅ `totalTrips` - Gradually incremented
- ✅ `mileage` - Updated based on speed and time
- ✅ `estimatedArrivalTime` - Calculated dynamically

### Course/Route Integration

Works with your existing course structure from `_data/courses.json`:

```json
{
  "routeName": "Nairobi CBD - Komarock",
  "routeNumber": "NK001",
  "stops": ["stop_id_1", "stop_id_2"],
  "assignedVehicles": ["vehicle_id_1", "vehicle_id_2"],
  "status": "Active"
}
```

**Background Job Features:**

- ✅ **Route-specific triggers** - Created for each stop in the route
- ✅ **Geofence alerts** - Triggers when vehicles approach stops
- ✅ **Route deviation detection** - Monitors off-route behavior
- ✅ **Stop arrival/departure events** - Simulated based on route data

### Driver Integration

Compatible with driver data from `_data/drivers.json`:

```json
{
  "driverName": "John Kamau",
  "status": "assigned",
  "employeeId": "EMP-24-0001",
  "vehicleAssignment": {
    "busNumber": "vehicle_id",
    "routeAssigned": "course_id"
  }
}
```

**Background Job Features:**

- ✅ **Driver-vehicle relationships** - Maintained during simulation
- ✅ **Assignment tracking** - Updates reflect current assignments
- ✅ **Performance monitoring** - Driver-specific metrics

## 🔧 Seeder Integration

### Existing Seeder Compatibility

The background job system works seamlessly with your existing `seeder.js`:

```bash
# Your existing seeder
npm run seed

# New trigger seeder
npm run seed:triggers
```

### Seeder Data Flow

1. **Base Data** - `seeder.js` creates vehicles, courses, drivers, assignments
2. **Trigger Creation** - `seedLocationTriggers.js` creates location triggers
3. **Background Jobs** - System uses seeded data for simulation

### Enhanced Seeder Features

The trigger seeder automatically:

- ✅ Creates triggers for all vehicles with status `in_use` or `available`
- ✅ Generates route-specific triggers based on assigned courses
- ✅ Creates stop arrival triggers for each stop in the route
- ✅ Maintains relationships with existing vehicle/course/driver data

## 🚨 Trigger Types & Integration

### 1. **Speed-based Triggers**

- Monitors vehicle speed against thresholds
- Uses vehicle's existing `averageSpeed` as baseline
- Triggers on high/low speed conditions

### 2. **Location-based Triggers**

- Geofence alerts for CBD and route stops
- Distance-based movement detection
- Uses actual stop coordinates from course data

### 3. **Time-based Triggers**

- Peak hour detection (7:00-9:00 AM, 5:00-8:00 PM)
- Regular update intervals
- Compatible with existing schedule data

### 4. **Event-based Triggers**

- Trip start/end events
- Stop arrival/departure events
- Status change notifications

### 5. **Route Deviation Triggers**

- Monitors vehicles against assigned routes
- Uses course stop data for route validation
- Alerts on significant deviations

### 6. **Performance-based Triggers**

- Fuel efficiency monitoring
- Idle time tracking
- Maintenance alerts based on mileage

## 📈 VehicleLocationHistory Integration

### Comprehensive Data Storage

Each simulation cycle creates detailed history entries:

```javascript
{
  vehicleId: "vehicle_id",
  timestamp: "2024-01-15T10:30:00Z",
  location: {
    latitude: -1.2921,
    longitude: 36.8219
  },
  speed: {
    current: 35,
    average: 40,
    max: 55
  },
  context: {
    triggerType: "speed_based",
    triggerId: "trigger_id",
    events: ["stop_arrival"],
    conditions: {
      weather: { condition: "clear", temperature: 25 },
      traffic: { level: "moderate" }
    },
    performance: {
      fuelEfficiency: 10.5,
      idleTime: 60
    },
    route: {
      routeId: "course_id",
      deviation: { distance: 25, duration: 15 }
    }
  },
  metadata: {
    source: "gps",
    accuracy: 3,
    batteryLevel: 85,
    signalStrength: 90
  }
}
```

### History Querying

The system supports efficient querying of historical data:

```javascript
// Get vehicle location history
const history = await VehicleLocationHistory.find({ vehicleId })
  .sort({ timestamp: -1 })
  .limit(100);

// Get trigger activations
const triggers = await VehicleLocationHistory.find({
  "context.triggerType": "speed_based",
});

// Get route-specific data
const routeData = await VehicleLocationHistory.find({
  "context.route.routeId": courseId,
});
```

## 🔄 CRUD Operation Support

### Vehicle CRUD

- ✅ **Create** - New vehicles automatically get triggers
- ✅ **Read** - Background jobs read vehicle data for simulation
- ✅ **Update** - Vehicle stats updated in real-time
- ✅ **Delete** - Triggers cleaned up when vehicles deleted

### Course/Route CRUD

- ✅ **Create** - New routes get route-specific triggers
- ✅ **Read** - Background jobs use route data for simulation
- ✅ **Update** - Route changes reflect in trigger conditions
- ✅ **Delete** - Route triggers cleaned up when routes deleted

### Driver CRUD

- ✅ **Create** - Driver assignments tracked in simulation
- ✅ **Read** - Driver-vehicle relationships maintained
- ✅ **Update** - Assignment changes reflect in vehicle data
- ✅ **Delete** - Driver removal updates vehicle assignments

## 🛠️ API Endpoints

### Background Job Management

| Method | Endpoint                                     | Description                 |
| ------ | -------------------------------------------- | --------------------------- |
| POST   | `/api/v1/background-jobs/initialize`         | Initialize the service      |
| POST   | `/api/v1/background-jobs/start`              | Start all background jobs   |
| POST   | `/api/v1/background-jobs/stop`               | Stop all background jobs    |
| POST   | `/api/v1/background-jobs/start-simulation`   | Start simulation only       |
| POST   | `/api/v1/background-jobs/stop-simulation`    | Stop simulation only        |
| GET    | `/api/v1/background-jobs/status`             | Get job status              |
| GET    | `/api/v1/background-jobs/simulation-status`  | Get simulation status       |
| POST   | `/api/v1/background-jobs/trigger-simulation` | Manually trigger simulation |

### Example Usage

```bash
# Initialize and start
curl -X POST http://localhost:5000/api/v1/background-jobs/initialize
curl -X POST http://localhost:5000/api/v1/background-jobs/start-simulation

# Monitor status
curl http://localhost:5000/api/v1/background-jobs/simulation-status

# Stop simulation
curl -X POST http://localhost:5000/api/v1/background-jobs/stop-simulation
```

## 📊 Monitoring & Analytics

### Real-time Console Output

```
🔄 Simulating Morning Rush Hour - Data Point 2/4
📍 Location: -1.2950, 36.8250
🚗 Speed: 25 km/h | 🧭 Heading: 95°
🌤️ Weather: clear | 🚦 Traffic: moderate

🚨 Vehicle KAA 001A: 2 triggers activated
   - speed_based trigger: Speed Alert - High Speed
   - location_based trigger: Geofence Alert - CBD Entry

📝 Vehicle KAA 001A: 2 history entries created
```

### Statistics Dashboard

```javascript
{
  "isRunning": true,
  "currentDataSet": "Morning Rush Hour",
  "currentDataPoint": 2,
  "totalDataPoints": 4,
  "activeVehicles": 10,
  "activeRoutes": 10,
  "totalDatasets": 3
}
```

## 🔧 Customization

### Adding New Vehicle Types

```javascript
// In vehicleDataSimulator.js
const customDataPoint = {
  location: { latitude: -1.2921, longitude: 36.8219 },
  context: {
    currentSpeed: 30,
    events: ["custom_event"],
    // ... other context data
  },
};
```

### Creating Custom Triggers

```javascript
const customTrigger = {
  name: "Custom Alert",
  type: "speed_based",
  vehicle: vehicleId,
  conditions: {
    speedBased: {
      thresholds: { high: 80, low: 10 },
    },
  },
  isActive: true,
};
```

### Modifying Simulation Intervals

```javascript
// In backgroundJobService.js
const simulationJob = cron.schedule("*/60 * * * * *", async () => {
  await this.simulator.simulateData();
});
```

## 🚀 Production Deployment

### Environment Variables

```bash
NODE_ENV=production
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
```

### Health Monitoring

- **Automatic health checks** every 5 minutes
- **Daily maintenance** cleanup at 2 AM
- **Memory management** and performance optimization
- **Error handling** and recovery mechanisms

### Scaling Considerations

- **Database indexing** for efficient queries
- **Batch processing** for multiple vehicles
- **Memory optimization** for long-running jobs
- **Load balancing** for high-traffic scenarios

## ✅ Summary

The background job system is **fully integrated** with your existing Sacco API application:

1. **✅ Compatible with existing CRUD operations**
2. **✅ Works with your seeder data structure**
3. **✅ Maintains vehicle/course/driver relationships**
4. **✅ Updates vehicle statistics in real-time**
5. **✅ Creates comprehensive location history**
6. **✅ Supports all trigger types**
7. **✅ Provides REST API for management**
8. **✅ Includes monitoring and analytics**

The system enhances your existing application without requiring any changes to your current data structure or CRUD operations, making it a seamless addition to your Sacco management system.

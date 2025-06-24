# New Data Handling in Background Job System

This document explains how the background job system automatically handles newly created vehicles, courses, drivers, and other data in your Sacco API application.

## 🆕 Overview

The background job system is designed to **automatically adapt** to new data creation without requiring manual intervention. When you create new vehicles, courses, drivers, or make changes to existing data, the system:

1. **Detects new data** automatically
2. **Creates appropriate triggers** for new vehicles
3. **Refreshes simulation data** to include new items
4. **Maintains real-time tracking** for all active entities
5. **Updates relationships** between vehicles, courses, and drivers

## 🔄 Automatic Data Refresh

### How It Works

The system includes an **automatic refresh mechanism** that runs every 5 minutes:

```javascript
// Every 30 seconds during simulation
if (this.shouldRefresh()) {
  await this.refreshData();
}
```

### What Gets Refreshed

- ✅ **Vehicle list** - New vehicles are automatically included
- ✅ **Course/Route data** - New routes are detected and integrated
- ✅ **Driver assignments** - New drivers and assignments are tracked
- ✅ **Trigger relationships** - New triggers are created for new vehicles
- ✅ **Simulation data** - All new data is included in the next simulation cycle

## 🚗 New Vehicle Handling

### Automatic Process

When a new vehicle is created:

1. **Vehicle Creation** → Your existing CRUD operation
2. **Trigger Creation** → System automatically creates location triggers
3. **Data Refresh** → Vehicle included in simulation
4. **Real-time Tracking** → Vehicle starts receiving location updates

### Example: Creating a New Vehicle

```javascript
// Your existing vehicle creation
const newVehicle = await Vehicle.create({
  plateNumber: "KAA 999Z",
  vehicleModel: "Toyota Hiace",
  seatingCapacity: 33,
  status: "available",
});

// System automatically handles:
// ✅ Creates 8 standard triggers (speed, location, time, etc.)
// ✅ Creates route-specific triggers if assigned to a route
// ✅ Includes vehicle in next simulation cycle
// ✅ Starts tracking location and performance
```

### API Endpoint for Manual Handling

```bash
# Manually handle new vehicle
curl -X POST http://localhost:5000/api/v1/background-jobs/handle-new-vehicle/{vehicleId}
```

**Response:**

```json
{
  "success": true,
  "message": "New vehicle handled successfully",
  "data": {
    "vehicleId": "vehicle_id",
    "triggersCreated": 8,
    "triggers": [...]
  }
}
```

## 🛣️ New Course/Route Handling

### Automatic Process

When a new course is created:

1. **Course Creation** → Your existing CRUD operation
2. **Route Analysis** → System analyzes stops and route data
3. **Trigger Creation** → Creates route-specific triggers for assigned vehicles
4. **Data Refresh** → Course included in simulation

### Example: Creating a New Route

```javascript
// Your existing course creation
const newCourse = await Course.create({
  routeName: "Nairobi CBD - Test Route",
  routeNumber: "NT001",
  stops: ["stop1", "stop2", "stop3"],
  status: "Active",
});

// System automatically handles:
// ✅ Creates stop arrival triggers for each stop
// ✅ Updates vehicles assigned to this route
// ✅ Creates geofence triggers for route boundaries
// ✅ Includes route in simulation data
```

### API Endpoint for Manual Handling

```bash
# Manually handle new course
curl -X POST http://localhost:5000/api/v1/background-jobs/handle-new-course/{courseId}
```

**Response:**

```json
{
  "success": true,
  "message": "New course handled successfully",
  "data": {
    "courseId": "course_id",
    "vehiclesUpdated": 3
  }
}
```

## 👨‍💼 New Driver Handling

### Automatic Process

When a new driver is created:

1. **Driver Creation** → Your existing CRUD operation
2. **Assignment Tracking** → System tracks driver-vehicle relationships
3. **Data Refresh** → Driver included in simulation data
4. **Performance Monitoring** → Driver-specific metrics tracked

### Example: Creating a New Driver

```javascript
// Your existing driver creation
const newDriver = await Driver.create({
  driverName: "John Test Driver",
  nationalId: "99999999",
  status: "active",
});

// System automatically handles:
// ✅ Tracks driver assignments
// ✅ Updates vehicle-driver relationships
// ✅ Includes driver in simulation data
// ✅ Monitors driver performance metrics
```

### API Endpoint for Manual Handling

```bash
# Manually handle new driver
curl -X POST http://localhost:5000/api/v1/background-jobs/handle-new-driver/{driverId}
```

## 🔄 Assignment Changes

### Vehicle-Route Assignment

When you assign a vehicle to a route:

```javascript
// Your existing assignment
await Vehicle.findByIdAndUpdate(vehicleId, {
  assignedRoute: courseId,
  status: "in_use",
});

// System automatically handles:
// ✅ Creates route-specific triggers
// ✅ Updates simulation data
// ✅ Starts route deviation monitoring
// ✅ Creates stop arrival triggers
```

### Driver-Vehicle Assignment

When you assign a driver to a vehicle:

```javascript
// Your existing assignment
await Vehicle.findByIdAndUpdate(vehicleId, {
  currentDriver: driverId,
});

// System automatically handles:
// ✅ Updates driver-vehicle relationship
// ✅ Tracks driver performance
// ✅ Updates simulation data
// ✅ Maintains assignment history
```

## 📊 Real-time Updates

### Console Output Examples

When new data is handled, you'll see output like:

```
🆕 New vehicle detected: 507f1f77bcf86cd799439011
✅ Created 8 triggers for new vehicle
🔄 Data refreshed successfully
📊 Current Status: 11 vehicles, 10 routes

🆕 New course detected: 507f1f77bcf86cd799439012
✅ Updated 3 vehicles for new course
🔄 Data refreshed successfully

🆕 Auto-handled new vehicle: KAA 999Z
🔄 Auto-refreshed data after vehicle assignment change
```

### Status Monitoring

```bash
# Check current status
curl http://localhost:5000/api/v1/background-jobs/status
```

**Response:**

```json
{
  "success": true,
  "data": {
    "isInitialized": true,
    "activeJobs": ["simulation", "maintenance", "healthCheck"],
    "simulatorStatus": {
      "isRunning": true,
      "currentDataSet": "Morning Rush Hour",
      "activeVehicles": 11,
      "activeRoutes": 10
    },
    "lastRefreshTime": "2024-01-15T10:30:00.000Z",
    "nextRefreshTime": "2024-01-15T10:35:00.000Z"
  }
}
```

## 🛠️ Manual Data Refresh

### Force Refresh

If you need to manually refresh data:

```bash
# Manual refresh
curl -X POST http://localhost:5000/api/v1/background-jobs/refresh-data
```

**Response:**

```json
{
  "success": true,
  "message": "Data refreshed successfully",
  "data": {
    "activeVehicles": 11,
    "activeRoutes": 10,
    "lastRefreshTime": "2024-01-15T10:32:00.000Z"
  }
}
```

## 🔧 Integration with Existing CRUD

### Vehicle CRUD Operations

| Operation  | Background Job Response                          |
| ---------- | ------------------------------------------------ |
| **Create** | ✅ Auto-creates triggers, includes in simulation |
| **Read**   | ✅ Uses existing data for simulation             |
| **Update** | ✅ Refreshes data, updates triggers if needed    |
| **Delete** | ✅ Removes from simulation, cleans up triggers   |

### Course CRUD Operations

| Operation  | Background Job Response                              |
| ---------- | ---------------------------------------------------- |
| **Create** | ✅ Creates route triggers, updates assigned vehicles |
| **Read**   | ✅ Uses route data for simulation                    |
| **Update** | ✅ Refreshes route triggers and vehicle assignments  |
| **Delete** | ✅ Removes route triggers, updates affected vehicles |

### Driver CRUD Operations

| Operation  | Background Job Response                               |
| ---------- | ----------------------------------------------------- |
| **Create** | ✅ Tracks driver, includes in simulation              |
| **Read**   | ✅ Uses driver data for assignments                   |
| **Update** | ✅ Refreshes assignments and relationships            |
| **Delete** | ✅ Updates vehicle assignments, removes from tracking |

## 📈 Performance Impact

### Automatic Refresh Timing

- **Refresh Interval**: Every 5 minutes
- **Simulation Cycle**: Every 30 seconds
- **Data Processing**: Asynchronous (non-blocking)
- **Memory Usage**: Minimal impact

### Optimization Features

- ✅ **Incremental Updates** - Only processes changed data
- ✅ **Batch Processing** - Handles multiple items efficiently
- ✅ **Async Operations** - Non-blocking data refresh
- ✅ **Memory Management** - Automatic cleanup of old data

## 🚀 Testing New Data Handling

### Run the Example

```bash
# Test new data handling
npm run test:newdata
```

This will demonstrate:

1. Creating a new vehicle
2. Creating a new course
3. Assigning vehicle to course
4. Creating a new driver
5. Assigning driver to vehicle
6. Monitoring real-time updates

### Expected Output

```
🚀 Demonstrating New Data Handling
=====================================

📊 Initial System Status:
   Vehicles: 10
   Routes: 10

🆕 Example 1: Creating a new vehicle...
✅ Created new vehicle: KAA 999Z
🔄 Handling new vehicle in background job system...
✅ Created 8 triggers for new vehicle
📊 Status after new vehicle: 11 vehicles

🆕 Example 2: Creating a new course...
✅ Created new course: Nairobi CBD - Test Route
🔄 Handling new course in background job system...
✅ Updated 0 vehicles for new course

🆕 Example 3: Assigning vehicle to route...
✅ Assigned vehicle KAA 999Z to route Nairobi CBD - Test Route
🔄 Refreshing data after assignment...

📊 Final System Status:
   Vehicles: 11
   Routes: 11
   Current Dataset: Morning Rush Hour

📊 Trigger Statistics:
   Total Triggers: 88
   Active Triggers: 88

By Vehicle:
   KAA 001A: 8 triggers, 8 active
   KAA 999Z: 8 triggers, 8 active

📝 New Vehicle History Entries: 4
Recent entries:
   10:35:30: Location update
   10:35:00: speed_based
   10:34:30: Location update
   10:34:00: location_based

✅ New data handling demonstration completed!
```

## 🔍 Monitoring and Debugging

### Check New Data Integration

```bash
# Check if new vehicle is included
curl http://localhost:5000/api/v1/background-jobs/simulation-status

# Check trigger creation
curl http://localhost:5000/api/v1/background-jobs/status

# Manual refresh if needed
curl -X POST http://localhost:5000/api/v1/background-jobs/refresh-data
```

### Debug Logs

The system provides detailed logging:

```
🆕 New vehicle detected: 507f1f77bcf86cd799439011
✅ Created 8 triggers for new vehicle
🔄 Data refreshed successfully
📊 Current Status: 11 vehicles, 10 routes
🔄 Auto-handled new vehicle: KAA 999Z
🔄 Auto-refreshed data after vehicle assignment change
```

## ✅ Summary

The background job system provides **seamless integration** with your existing CRUD operations:

1. **✅ Automatic Detection** - New data is detected automatically
2. **✅ Trigger Creation** - Appropriate triggers are created for new vehicles
3. **✅ Data Refresh** - System refreshes every 5 minutes
4. **✅ Real-time Updates** - New data is included in simulation immediately
5. **✅ Relationship Tracking** - Maintains all vehicle-course-driver relationships
6. **✅ Performance Monitoring** - Tracks performance for all entities
7. **✅ Manual Control** - API endpoints for manual handling
8. **✅ Comprehensive Logging** - Detailed logs for monitoring and debugging

The system ensures that **any new data you create** is automatically integrated into the background job system without requiring manual intervention, making it a truly dynamic and adaptive solution for your Sacco management application.

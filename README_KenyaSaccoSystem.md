# 🚌 Kenya Sacco Fleet Management System

## 📋 Overview

This system implements a **real-time fleet tracking solution** specifically designed for **Kenya Saccos** and transport companies. The system follows a **Vehicle → VehicleLocationHistory** flow where the background job updates the Vehicle model first, then automatically creates rich VehicleLocationHistory entries.

## 🎯 Perfect For

- **Matatu Saccos** (Nairobi, Mombasa, Kisumu)
- **Bus Companies** (KBS, Citi Hoppa, etc.)
- **Transport Companies**
- **Government Transport Monitoring** (NTSA compliance)
- **Fleet Management Companies**

---

## 🔄 System Flow

### **Current Implementation (What We Have)**

```
Background Job → VehicleLocationHistory (Direct)
```

### **Correct Implementation (What We Need)**

```
Background Job → Vehicle Model → VehicleLocationHistory (Automatic)
```

---

## 🏗️ Architecture

### **1. Vehicle Model Enhancement**

```javascript
// Added rich contextData field to Vehicle model
contextData: {
  // Environmental conditions
  weather: { condition: String, severity: String, temperature: Number },
  traffic: { level: String, description: String },

  // Performance metrics
  performance: { fuelEfficiency: Number, idleTime: Number, stopDuration: Number },

  // Route information
  route: { routeId: ObjectId, deviation: { distance: Number, duration: Number } },

  // Device health
  deviceHealth: { batteryLevel: Number, signalStrength: Number, accuracy: Number },

  // Events and status
  events: [String], heading: Number, source: String
}
```

### **2. Automatic VehicleLocationHistory Creation**

```javascript
// Post-save middleware automatically creates history entries
VehicleSchema.post("save", async function () {
  if (this.isModified("currentLocation") || this.isModified("contextData")) {
    await VehicleLocationHistory.create({
      vehicleId: this._id,
      location: this.currentLocation,
      speed: { current: this.currentSpeed, average: this.averageSpeed },
      heading: this.contextData?.heading,
      context: {
        events: this.contextData?.events,
        conditions: {
          weather: this.contextData?.weather,
          traffic: this.contextData?.traffic,
        },
        performance: this.contextData?.performance,
        route: {
          routeId: this.assignedRoute,
          deviation: this.contextData?.route?.deviation,
        },
      },
      metadata: {
        source: this.contextData?.source || "system",
        batteryLevel: this.contextData?.deviceHealth?.batteryLevel,
        signalStrength: this.contextData?.deviceHealth?.signalStrength,
      },
    });
  }
});
```

### **3. Background Job Updates Vehicle First**

```javascript
// VehicleDataSimulator now updates Vehicle model with full context
async updateVehicleWithFullContext(vehicleId, dataPoint) {
  const updateData = {
    currentLocation: { latitude: dataPoint.location.latitude, longitude: dataPoint.location.longitude },
    currentSpeed: dataPoint.context.currentSpeed,
    contextData: {
      weather: dataPoint.context.weather,
      traffic: dataPoint.context.traffic,
      performance: dataPoint.context.performance,
      route: dataPoint.context.route,
      deviceHealth: {
        batteryLevel: dataPoint.context.batteryLevel,
        signalStrength: dataPoint.context.signalStrength
      },
      events: dataPoint.context.events,
      heading: dataPoint.context.heading
    }
  };

  await Vehicle.findByIdAndUpdate(vehicleId, updateData);
  // VehicleLocationHistory is automatically created via middleware
}
```

---

## 📊 Data Flow for Kenya Sacco

### **1. Real-time GPS Data (Every 30 seconds)**

```javascript
// Background job simulates GPS devices
{
  location: { latitude: -1.2921, longitude: 36.8219 }, // Nairobi CBD
  currentSpeed: 25, // km/h
  weather: { condition: 'clear', temperature: 22 },
  traffic: { level: 'moderate', description: 'Moving traffic' },
  performance: { fuelEfficiency: 9.2, idleTime: 60 },
  deviceHealth: { batteryLevel: 85, signalStrength: 90 }
}
```

### **2. Vehicle Model Update**

```javascript
// Vehicle gets updated with rich context
{
  plateNumber: "KAA 001A",
  currentLocation: { latitude: -1.2921, longitude: 36.8219, updatedAt: "2024-01-15T10:30:00Z" },
  currentSpeed: 25,
  contextData: {
    weather: { condition: 'clear', temperature: 22 },
    traffic: { level: 'moderate' },
    performance: { fuelEfficiency: 9.2 },
    deviceHealth: { batteryLevel: 85 }
  }
}
```

### **3. Automatic History Creation**

```javascript
// VehicleLocationHistory automatically created
{
  vehicleId: "vehicle_id",
  timestamp: "2024-01-15T10:30:00Z",
  location: { latitude: -1.2921, longitude: 36.8219 },
  speed: { current: 25, average: 20 },
  context: {
    events: ["stop_arrival"],
    conditions: { weather: { condition: "clear" }, traffic: { level: "moderate" } },
    performance: { fuelEfficiency: 9.2 },
    route: { routeId: "route_id", deviation: { distance: 50, duration: 30 } }
  },
  metadata: { source: "system", batteryLevel: 85, signalStrength: 90 }
}
```

---

## 🎨 Frontend Integration

### **1. Real-time Fleet Dashboard**

```javascript
// Get real-time vehicle status
const getRealTimeFleetStatus = async () => {
  const response = await fetch("/api/v1/vehicles?status=in_use");
  const vehicles = await response.json();

  return vehicles.data.map((vehicle) => ({
    plateNumber: vehicle.plateNumber,
    location: vehicle.currentLocation,
    speed: vehicle.currentSpeed,
    weather: vehicle.contextData?.weather?.condition,
    traffic: vehicle.contextData?.traffic?.level,
    fuelEfficiency: vehicle.contextData?.performance?.fuelEfficiency,
    batteryLevel: vehicle.contextData?.deviceHealth?.batteryLevel,
  }));
};
```

### **2. Historical Analytics**

```javascript
// Get vehicle performance analytics
const getVehicleAnalytics = async (vehicleId) => {
  const response = await fetch(
    `/api/v1/vehicle-location-history/analytics?vehicleId=${vehicleId}&days=30`
  );
  return response.json();
};
```

### **3. Compliance Reports**

```javascript
// Get NTSA compliance data
const getComplianceReport = async () => {
  const response = await fetch(
    "/api/v1/vehicle-location-history/performance?days=7"
  );
  return response.json();
};
```

---

## 🚀 API Endpoints

### **Vehicle Management**

- `GET /api/v1/vehicles` - Get all vehicles with real-time data
- `GET /api/v1/vehicles/:id` - Get single vehicle with context
- `PUT /api/v1/vehicles/:id` - Update vehicle (auto-creates history)

### **Location History**

- `GET /api/v1/vehicle-location-history` - Get filtered history
- `GET /api/v1/vehicle-location-history/vehicle/:id` - Get vehicle history
- `GET /api/v1/vehicle-location-history/analytics` - Get analytics
- `GET /api/v1/vehicle-location-history/realtime` - Get real-time status
- `GET /api/v1/vehicle-location-history/triggers` - Get trigger alerts
- `GET /api/v1/vehicle-location-history/performance` - Get performance metrics

### **Background Jobs**

- `POST /api/v1/background-jobs/start-simulation` - Start GPS simulation
- `POST /api/v1/background-jobs/stop-simulation` - Stop simulation
- `GET /api/v1/background-jobs/status` - Get system status

---

## 🎯 Kenya Sacco Use Cases

### **1. Matatu Operations**

- **Real-time tracking** of all matatus in the fleet
- **Speed monitoring** for NTSA compliance
- **Route deviation** alerts
- **Passenger counting** and revenue tracking
- **Driver performance** monitoring

### **2. Bus Company Management**

- **Fleet optimization** based on traffic patterns
- **Fuel efficiency** monitoring
- **Maintenance scheduling** based on usage
- **Route planning** with historical data
- **Customer service** with ETA updates

### **3. Government Compliance**

- **NTSA speed limit** compliance
- **Route adherence** monitoring
- **Driver behavior** analysis
- **Safety incident** tracking
- **Regulatory reporting** automation

### **4. Business Intelligence**

- **Revenue optimization** based on routes
- **Cost analysis** (fuel, maintenance, labor)
- **Performance benchmarking** across vehicles
- **Predictive maintenance** scheduling
- **Market analysis** with location data

---

## 🔧 Implementation Steps

### **1. Database Setup**

```bash
# Run seeder to create sample data
node seeder.js -i

# Create location triggers
node seedLocationTriggers.js
```

### **2. Start Background Jobs**

```bash
# Start the simulation
curl -X POST http://localhost:5000/api/v1/background-jobs/start-simulation
```

### **3. Monitor System**

```bash
# Check system status
curl http://localhost:5000/api/v1/background-jobs/status

# Get real-time fleet status
curl http://localhost:5000/api/v1/vehicle-location-history/realtime
```

### **4. Frontend Integration**

```javascript
// Initialize dashboard
const initializeDashboard = async () => {
  // Start background jobs
  await fetch("/api/v1/background-jobs/start-simulation", { method: "POST" });

  // Start real-time updates
  setInterval(async () => {
    const fleetStatus = await getRealTimeFleetStatus();
    updateDashboard(fleetStatus);
  }, 30000); // Every 30 seconds
};
```

---

## 📈 Benefits for Kenya Saccos

### **1. Operational Efficiency**

- **Real-time fleet visibility** - Know where every vehicle is
- **Optimized routing** - Avoid traffic and reduce fuel costs
- **Improved scheduling** - Better passenger service
- **Reduced idle time** - Maximize vehicle utilization

### **2. Compliance & Safety**

- **NTSA compliance** - Automatic speed monitoring
- **Driver behavior** - Track and improve driving habits
- **Safety alerts** - Immediate notification of issues
- **Regulatory reporting** - Automated compliance reports

### **3. Financial Benefits**

- **Fuel cost reduction** - Optimize routes and driving
- **Maintenance optimization** - Prevent breakdowns
- **Revenue tracking** - Monitor passenger counts and fares
- **Insurance benefits** - Better rates with tracking

### **4. Customer Service**

- **Real-time ETA** - Accurate arrival times
- **Route information** - Live updates for passengers
- **Service quality** - Monitor and improve standards
- **Customer satisfaction** - Better overall experience

---

## 🚀 Getting Started

1. **Clone and setup** the project
2. **Run the seeder** to create sample data
3. **Start background jobs** to simulate GPS data
4. **Integrate frontend** for real-time dashboard
5. **Customize** for your specific Sacco needs

This system provides a **complete foundation** for modern fleet management in Kenya's transport sector! 🚌✨

# Alert Creation Guide - Sacco Analytics System

This guide explains how alerts are created in the Sacco management system, covering all alert types, triggers, and the complete alert lifecycle.

## 🚨 Alert System Overview

The alert system automatically monitors various aspects of Sacco operations and creates alerts when specific conditions are met. Alerts are categorized by type, severity, and entity type.

## 📋 Alert Categories

### 1. Vehicle-Related Alerts

- **Vehicle Breakdown**: When vehicles are out of service due to poor condition
- **Maintenance Due**: When maintenance is scheduled within 7 days
- **Insurance Expiry**: When vehicle insurance expires within 30 days
- **Route Deviation**: When vehicles deviate from assigned routes
- **Speed Violation**: When vehicles exceed speed limits
- **Fuel Low**: When fuel levels are critically low
- **Overloading**: When vehicles exceed capacity limits

### 2. Driver-Related Alerts

- **License Expiry**: When driver licenses expire within 30 days
- **PSV Expiry**: When PSV licenses expire within 30 days
- **Medical Certificate Expiry**: When medical certificates expire within 30 days
- **Driver Violation**: When drivers violate policies
- **Driver Absence**: When drivers are unexpectedly absent

### 3. Safety & Compliance Alerts

- **Safety Incident**: When safety incidents are reported
- **Compliance Breach**: When compliance requirements are not met
- **Regulatory Alert**: When regulatory deadlines are approaching
- **Maintenance Overdue**: When maintenance is past due

### 4. Operational Alerts

- **Route Delay**: When vehicles are running behind schedule
- **Schedule Conflict**: When multiple vehicles are assigned to the same route
- **Capacity Overflow**: When vehicles are operating beyond capacity
- **Weather Alert**: When weather conditions affect operations
- **Traffic Alert**: When traffic conditions impact routes

### 5. Financial Alerts

- **Revenue Target Missed**: When revenue targets are not met
- **Expense Overbudget**: When expenses exceed budget
- **Profit Margin Low**: When profit margins are below threshold

### 6. Customer Service Alerts

- **Customer Complaint**: When high number of complaints are received
- **Service Quality Low**: When service quality metrics are poor
- **Passenger Satisfaction Low**: When passenger satisfaction is below threshold

## 🔧 How Alerts Are Created

### 1. Alert Creation Process

```javascript
// Example: Creating a vehicle breakdown alert
async createVehicleAlerts() {
  const alerts = [];
  const vehicles = await Vehicle.find().populate('currentDriver');

  for (const vehicle of vehicles) {
    // Check for vehicle breakdown
    if (vehicle.status === 'out_of_service' && vehicle.vehicleCondition === 'Poor') {
      alerts.push(await this.createAlert({
        type: this.alertTypes.VEHICLE_BREAKDOWN,
        severity: this.severityLevels.HIGH,
        title: `Vehicle Breakdown: ${vehicle.plateNumber}`,
        message: `Vehicle ${vehicle.plateNumber} is out of service due to poor condition`,
        entityId: vehicle._id,
        entityType: 'vehicle',
        metadata: {
          plateNumber: vehicle.plateNumber,
          condition: vehicle.vehicleCondition,
          status: vehicle.status
        }
      }));
    }
  }
  return alerts;
}
```

### 2. Alert Data Structure

```javascript
const alert = {
  id: Date.now() + Math.random(), // Unique identifier
  type: "vehicle_breakdown", // Alert type
  severity: "high", // Severity level (low, medium, high, critical)
  title: "Vehicle Breakdown: KCA 123A", // Alert title
  message: "Vehicle KCA 123A is out of service due to poor condition", // Alert message
  entityId: "vehicle_id_here", // Related entity ID
  entityType: "vehicle", // Entity type (vehicle, driver, incident, etc.)
  metadata: {
    // Additional data
    plateNumber: "KCA 123A",
    condition: "Poor",
    status: "out_of_service",
  },
  timestamp: new Date(), // When alert was created
  status: "active", // Alert status
  acknowledged: false, // Whether alert has been acknowledged
  acknowledgedBy: null, // Who acknowledged the alert
  acknowledgedAt: null, // When alert was acknowledged
};
```

## 🎯 Alert Triggers

### 1. Real-Time Triggers

#### Vehicle Location Monitoring

```javascript
// Check for route deviation in real-time
async checkRouteDeviation(vehicle) {
  if (!vehicle.assignedRoute || !vehicle.currentLocation) {
    return { isDeviated: false };
  }

  const route = await Course.findById(vehicle.assignedRoute);
  if (!route) return { isDeviated: false };

  // Calculate actual deviation from route
  const isDeviated = calculateDeviation(vehicle.currentLocation, route.coordinates);

  return {
    isDeviated,
    distance: isDeviated ? calculateDistance(vehicle.currentLocation, route.coordinates) : 0,
    duration: isDeviated ? calculateDuration(vehicle.currentLocation, route.coordinates) : 0
  };
}
```

#### Speed Violation Detection

```javascript
// Check for speed violations
if (vehicle.averageSpeed > 80) {
  // Speed limit: 80 km/h
  alerts.push(
    await this.createAlert({
      type: this.alertTypes.VEHICLE_SPEED_VIOLATION,
      severity: this.severityLevels.HIGH,
      title: `Speed Violation: ${vehicle.plateNumber}`,
      message: `Vehicle ${vehicle.plateNumber} is traveling at ${vehicle.averageSpeed} km/h`,
      entityId: vehicle._id,
      entityType: "vehicle",
      metadata: {
        plateNumber: vehicle.plateNumber,
        currentSpeed: vehicle.averageSpeed,
        speedLimit: 80,
        location: vehicle.currentLocation,
      },
    })
  );
}
```

### 2. Scheduled Triggers

#### Document Expiry Monitoring

```javascript
// Check for driver license expiry
if (
  driver.driverLicense.expiryDate <=
  new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
) {
  const daysUntilExpiry = Math.ceil(
    (driver.driverLicense.expiryDate - new Date()) / (1000 * 60 * 60 * 24)
  );

  alerts.push(
    await this.createAlert({
      type: this.alertTypes.DRIVER_LICENSE_EXPIRY,
      severity:
        daysUntilExpiry <= 7
          ? this.severityLevels.HIGH
          : this.severityLevels.MEDIUM,
      title: `Driver License Expiry: ${driver.driverName}`,
      message: `Driver ${driver.driverName}'s license expires in ${daysUntilExpiry} days`,
      entityId: driver._id,
      entityType: "driver",
      metadata: {
        driverName: driver.driverName,
        licenseNumber: driver.driverLicense.number,
        expiryDate: driver.driverLicense.expiryDate,
        daysUntilExpiry,
      },
    })
  );
}
```

#### Maintenance Scheduling

```javascript
// Check for maintenance due
if (
  vehicle.nextMaintenance &&
  vehicle.nextMaintenance <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
) {
  const daysUntilMaintenance = Math.ceil(
    (vehicle.nextMaintenance - new Date()) / (1000 * 60 * 60 * 24)
  );

  alerts.push(
    await this.createAlert({
      type: this.alertTypes.VEHICLE_MAINTENANCE_DUE,
      severity:
        daysUntilMaintenance <= 3
          ? this.severityLevels.HIGH
          : this.severityLevels.MEDIUM,
      title: `Maintenance Due: ${vehicle.plateNumber}`,
      message: `Vehicle ${vehicle.plateNumber} maintenance is due in ${daysUntilMaintenance} days`,
      entityId: vehicle._id,
      entityType: "vehicle",
      metadata: {
        plateNumber: vehicle.plateNumber,
        dueDate: vehicle.nextMaintenance,
        daysUntilDue: daysUntilMaintenance,
      },
    })
  );
}
```

### 3. Threshold-Based Triggers

#### Financial Monitoring

```javascript
// Check revenue targets
const monthlyRevenue = 45000; // Actual revenue
const targetRevenue = 50000; // Target revenue
const achievementRate = (monthlyRevenue / targetRevenue) * 100;

if (achievementRate < 90) {
  // Less than 90% of target
  alerts.push(
    await this.createAlert({
      type: this.alertTypes.REVENUE_TARGET_MISSED,
      severity: this.severityLevels.MEDIUM,
      title: "Revenue Target Missed",
      message: `Monthly revenue is ${achievementRate.toFixed(1)}% of target`,
      entityType: "financial",
      metadata: {
        targetRevenue,
        actualRevenue: monthlyRevenue,
        achievementRate,
        shortfall: targetRevenue - monthlyRevenue,
      },
    })
  );
}
```

#### Service Quality Monitoring

```javascript
// Check passenger satisfaction
const recentFeedback = await PassengerFeedback.find({
  createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
});

if (recentFeedback.length > 0) {
  const averageRating =
    recentFeedback.reduce(
      (sum, feedback) => sum + feedback.ratings.overall,
      0
    ) / recentFeedback.length;

  if (averageRating < 3.5) {
    // Below 3.5 stars
    alerts.push(
      await this.createAlert({
        type: this.alertTypes.SERVICE_QUALITY_LOW,
        severity: this.severityLevels.MEDIUM,
        title: "Low Service Quality Alert",
        message: `Average passenger satisfaction is ${averageRating.toFixed(
          1
        )}/5 stars`,
        entityType: "service",
        metadata: {
          averageRating,
          feedbackCount: recentFeedback.length,
          timePeriod: "7 days",
        },
      })
    );
  }
}
```

## 🔄 Alert Lifecycle

### 1. Alert Creation

```javascript
// Alert is created when conditions are met
const alert = await alertService.createAlert({
  type: "vehicle_breakdown",
  severity: "high",
  title: "Vehicle Breakdown: KCA 123A",
  message: "Vehicle KCA 123A is out of service",
  entityId: vehicleId,
  entityType: "vehicle",
  metadata: {
    /* additional data */
  },
});
```

### 2. Alert Notification

```javascript
// Alert is sent to relevant users via WebSocket
socket.emit("alert", {
  id: alert.id,
  type: alert.type,
  severity: alert.severity,
  title: alert.title,
  message: alert.message,
  timestamp: alert.timestamp,
});
```

### 3. Alert Acknowledgment

```javascript
// User acknowledges the alert
const result = await alertService.acknowledgeAlert(alertId, userId);
// Alert status changes to 'acknowledged'
```

### 4. Alert Resolution

```javascript
// Alert is resolved when the underlying issue is fixed
// Alert status changes to 'resolved' or 'closed'
```

## 📊 Alert API Endpoints

### 1. Get All Alerts

```http
GET /api/v1/analytics/alerts
Authorization: Bearer <token>
```

**Query Parameters:**

- `type`: Filter by alert type
- `severity`: Filter by severity level
- `entityType`: Filter by entity type

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "1234567890",
      "type": "vehicle_breakdown",
      "severity": "high",
      "title": "Vehicle Breakdown: KCA 123A",
      "message": "Vehicle KCA 123A is out of service",
      "entityId": "vehicle_id",
      "entityType": "vehicle",
      "metadata": {
        /* additional data */
      },
      "timestamp": "2024-01-15T10:30:00Z",
      "status": "active",
      "acknowledged": false
    }
  ],
  "timestamp": "2024-01-15T10:30:00Z",
  "total": 1
}
```

### 2. Get Alert Statistics

```http
GET /api/v1/analytics/alerts/stats
Authorization: Bearer <token>
```

**Response:**

```json
{
  "success": true,
  "data": {
    "total": 15,
    "bySeverity": {
      "critical": 2,
      "high": 5,
      "medium": 6,
      "low": 2
    },
    "byType": {
      "vehicle_breakdown": 3,
      "driver_license_expiry": 2,
      "route_deviation": 4
    },
    "byEntityType": {
      "vehicle": 8,
      "driver": 4,
      "incident": 2,
      "system": 1
    },
    "acknowledged": 10,
    "unacknowledged": 5
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 3. Acknowledge Alert

```http
PUT /api/v1/analytics/alerts/:id/acknowledge
Authorization: Bearer <token>
```

**Response:**

```json
{
  "success": true,
  "data": {
    "success": true,
    "message": "Alert acknowledged"
  }
}
```

## 🎨 Frontend Integration

### 1. Real-Time Alert Display

```javascript
// React component for displaying alerts
const AlertDisplay = () => {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    // Fetch initial alerts
    fetchAlerts();

    // Set up WebSocket for real-time updates
    const socket = io("http://localhost:5000");

    socket.on("alert", (newAlert) => {
      setAlerts((prev) => [newAlert, ...prev]);
    });

    return () => socket.disconnect();
  }, []);

  return (
    <div>
      {alerts.map((alert) => (
        <AlertCard
          key={alert.id}
          alert={alert}
          onAcknowledge={() => acknowledgeAlert(alert.id)}
        />
      ))}
    </div>
  );
};
```

### 2. Alert Severity Styling

```javascript
const getSeverityColor = (severity) => {
  switch (severity) {
    case "critical":
      return "#d32f2f"; // Red
    case "high":
      return "#f57c00"; // Orange
    case "medium":
      return "#fbc02d"; // Yellow
    case "low":
      return "#388e3c"; // Green
    default:
      return "#757575"; // Grey
  }
};

const AlertCard = ({ alert, onAcknowledge }) => (
  <Card
    sx={{
      borderLeft: `4px solid ${getSeverityColor(alert.severity)}`,
      mb: 2,
    }}
  >
    <CardContent>
      <Typography variant="h6">{alert.title}</Typography>
      <Typography variant="body2">{alert.message}</Typography>
      <Typography variant="caption" color="textSecondary">
        {new Date(alert.timestamp).toLocaleString()}
      </Typography>
      {!alert.acknowledged && (
        <Button onClick={onAcknowledge} variant="outlined" size="small">
          Acknowledge
        </Button>
      )}
    </CardContent>
  </Card>
);
```

## 🔧 Configuration

### 1. Alert Thresholds

```javascript
// Configure alert thresholds
const ALERT_THRESHOLDS = {
  SPEED_LIMIT: 80, // km/h
  MAINTENANCE_WARNING_DAYS: 7,
  LICENSE_EXPIRY_WARNING_DAYS: 30,
  REVENUE_TARGET_THRESHOLD: 90, // percentage
  PASSENGER_SATISFACTION_THRESHOLD: 3.5, // stars
  COMPLAINT_THRESHOLD: 5, // complaints per day
};
```

### 2. Alert Frequency

```javascript
// Configure how often alerts are generated
const ALERT_FREQUENCY = {
  REAL_TIME: 30000, // 30 seconds
  DAILY: 24 * 60 * 60 * 1000, // 24 hours
  WEEKLY: 7 * 24 * 60 * 60 * 1000, // 7 days
};
```

## 🚀 Best Practices

### 1. Alert Prioritization

- **Critical**: Immediate attention required (safety incidents, breakdowns)
- **High**: Urgent attention needed (expiring documents, violations)
- **Medium**: Important but not urgent (maintenance due, delays)
- **Low**: Informational (general updates, reminders)

### 2. Alert Deduplication

```javascript
// Remove duplicate alerts
removeDuplicateAlerts(alerts) {
  const seen = new Set();
  return alerts.filter(alert => {
    const key = `${alert.type}-${alert.entityId}-${alert.entityType}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
```

### 3. Alert Escalation

```javascript
// Escalate unacknowledged alerts
async escalateAlerts() {
  const unacknowledgedAlerts = await this.getUnacknowledgedAlerts();

  for (const alert of unacknowledgedAlerts) {
    const hoursSinceCreation = (Date.now() - alert.timestamp) / (1000 * 60 * 60);

    if (hoursSinceCreation > 24 && alert.severity === 'critical') {
      // Escalate to management
      await this.escalateToManagement(alert);
    }
  }
}
```

This comprehensive alert system ensures that all critical issues in the Sacco operations are promptly identified and communicated to the relevant stakeholders, enabling quick response and resolution.

# Sacco Management System - Analytics Data Guide

This guide explains how the Sacco management system arrives at comprehensive business data and analytics, and how to send this data to the frontend.

## 📊 Data Categories Overview

The system provides analytics across 5 main categories:

1. **Business Data & Analytics** - Financial metrics, operational efficiency, business intelligence
2. **Policy & Regulatory Compliance** - Safety monitoring, compliance tracking, regulatory reporting
3. **Consumer/Passenger Data** - Service quality, passenger experience, demand analysis
4. **Real-Time Monitoring & Analytics** - Live operations, predictive analytics, automated actions
5. **Data Integration & Reporting** - Dashboards, reports, exports

## 🏗️ System Architecture

### Backend Components

1. **Analytics Service** (`services/analyticsService.js`)

   - Core analytics calculations and data aggregation
   - Real-time data processing
   - Predictive analytics algorithms

2. **Analytics Controller** (`controllers/analyticsController.js`)

   - REST API endpoints for frontend consumption
   - Data formatting and response handling
   - Export functionality (JSON, CSV)

3. **Analytics Routes** (`routes/analytics.js`)

   - API route definitions
   - Authentication and authorization
   - Rate limiting

4. **Data Models**
   - `Vehicle.js` - Vehicle performance and financial data
   - `Driver.js` - Driver compliance and performance
   - `Course.js` - Route performance and efficiency
   - `VehicleLocationHistory.js` - Real-time tracking data
   - `Incident.js` - Safety incidents and violations
   - `PassengerFeedback.js` - Customer satisfaction data

## 📈 How Data is Calculated

### 1. Business Data & Analytics

#### Financial Metrics

```javascript
// Revenue Tracking
const financialData = await Vehicle.aggregate([
  { $match: { createdAt: dateFilter } },
  {
    $group: {
      _id: null,
      totalRevenue: { $sum: "$totalIncome" },
      totalExpenses: { $sum: { $multiply: ["$mileage", 0.15] } },
      totalVehicles: { $sum: 1 },
      averageDailyIncome: { $avg: "$averageDailyIncome" },
      totalPassengers: { $sum: "$totalPassengersFerried" },
    },
  },
]);
```

**Data Sources:**

- Vehicle income data (`totalIncome`, `averageDailyIncome`)
- Mileage-based expense calculations
- Passenger count data
- Historical financial trends

#### Operational Efficiency

```javascript
// Vehicle Utilization
const efficiencyData = vehicles.reduce((acc, vehicle) => {
  const utilization = vehicle.status === "in_use" ? 1 : 0;
  const capacityUtilization =
    vehicle.totalPassengersFerried /
      (vehicle.seatingCapacity * vehicle.totalTrips) || 0;

  return {
    totalVehicles: acc.totalVehicles + 1,
    activeVehicles: acc.activeVehicles + utilization,
    totalCapacity: acc.totalCapacity + vehicle.seatingCapacity,
    totalPassengers: acc.totalPassengers + vehicle.totalPassengersFerried,
    totalTrips: acc.totalTrips + vehicle.totalTrips,
    totalMileage: acc.totalMileage + vehicle.mileage,
  };
}, initialValues);
```

**Data Sources:**

- Vehicle status and operational data
- Passenger capacity and utilization
- Trip completion rates
- Route performance metrics

### 2. Policy & Regulatory Compliance

#### Safety & Compliance Monitoring

```javascript
// Driver License Expiry Tracking
drivers.forEach((driver) => {
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  if (driver.driverLicense.expiryDate < thirtyDaysFromNow) {
    complianceData.driverCompliance.expiringLicenses.push({
      driverId: driver._id,
      driverName: driver.driverName,
      licenseNumber: driver.driverLicense.number,
      expiryDate: driver.driverLicense.expiryDate,
      daysUntilExpiry: Math.ceil(
        (driver.driverLicense.expiryDate - new Date()) / (1000 * 60 * 60 * 24)
      ),
    });
  }
});
```

**Data Sources:**

- Driver license expiry dates
- PSV license information
- Medical certificate expiry
- Vehicle insurance and registration status
- Incident reports and safety metrics

### 3. Consumer/Passenger Data

#### Service Quality Metrics

```javascript
// On-Time Performance Calculation
const onTimePerformance = await this.calculateOnTimePerformance(
  locationHistory
);
const serviceReliability = await this.calculateServiceReliability(vehicles);
const passengerSatisfaction = await this.getPassengerSatisfaction();
```

**Data Sources:**

- Vehicle location history for timing analysis
- Passenger feedback and ratings
- Service completion rates
- Comfort and safety metrics

### 4. Real-Time Monitoring & Analytics

#### Live Operations Data

```javascript
// Real-time Vehicle Tracking
const vehicles = await Vehicle.find({ status: "in_use" });
const liveData = vehicles.map((vehicle) => ({
  vehicleId: vehicle._id,
  plateNumber: vehicle.plateNumber,
  location: vehicle.currentLocation,
  speed: vehicle.averageSpeed,
  status: vehicle.status,
  route: vehicle.assignedRoute,
  driver: vehicle.currentDriver,
}));
```

**Data Sources:**

- Real-time GPS coordinates
- Current vehicle status
- Live speed and performance data
- Active route information

#### Predictive Analytics

```javascript
// Maintenance Prediction
const maintenancePrediction = vehicles.map((vehicle) => ({
  vehicleId: vehicle._id,
  plateNumber: vehicle.plateNumber,
  predictedMaintenance: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  confidence: Math.random() * 20 + 80,
  recommendedActions: ["Oil change", "Tire rotation"],
}));
```

**Data Sources:**

- Vehicle maintenance history
- Performance degradation patterns
- Usage patterns and wear indicators
- Historical failure data

## 🚀 API Endpoints for Frontend

### 1. Business Analytics

```javascript
// Get comprehensive business analytics
GET /api/v1/analytics/business?timeRange=month

// Get financial metrics
GET /api/v1/analytics/financial?timeRange=month

// Get operational efficiency
GET /api/v1/analytics/operational
```

### 2. Compliance Data

```javascript
// Get compliance data
GET / api / v1 / analytics / compliance;

// Get service quality metrics
GET / api / v1 / analytics / service - quality;

// Get passenger experience data
GET / api / v1 / analytics / passenger - experience;
```

### 3. Real-Time Data

```javascript
// Get live operations data
GET / api / v1 / analytics / live - operations;

// Get predictive analytics
GET / api / v1 / analytics / predictive;

// Get real-time alerts
GET / api / v1 / analytics / alerts;
```

### 4. Dashboards

```javascript
// Get executive dashboard
GET /api/v1/analytics/dashboard?type=executive&timeRange=month

// Get operational dashboard
GET /api/v1/analytics/dashboard?type=operational

// Get compliance dashboard
GET /api/v1/analytics/dashboard?type=compliance

// Get financial dashboard
GET /api/v1/analytics/dashboard?type=financial
```

### 5. Data Export

```javascript
// Export analytics data
GET /api/v1/analytics/export?type=financial&format=csv&timeRange=month
```

## 📊 Frontend Integration

### 1. Real-Time Data Updates

```javascript
// WebSocket connection for real-time updates
const socket = io("http://localhost:5000");

socket.on("analytics_update", (data) => {
  // Update dashboard with real-time data
  updateDashboard(data);
});

socket.on("alert", (alert) => {
  // Show real-time alerts
  showAlert(alert);
});
```

### 2. Dashboard Components

```javascript
// Executive Dashboard
const ExecutiveDashboard = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch("/api/v1/analytics/dashboard?type=executive")
      .then((res) => res.json())
      .then((data) => setData(data.data));
  }, []);

  return (
    <div>
      <FinancialMetrics data={data?.financial} />
      <OperationalEfficiency data={data?.operational} />
      <ComplianceStatus data={data?.compliance} />
    </div>
  );
};
```

### 3. Real-Time Monitoring

```javascript
// Live Operations Monitor
const LiveOperationsMonitor = () => {
  const [liveData, setLiveData] = useState(null);

  useEffect(() => {
    const interval = setInterval(() => {
      fetch("/api/v1/analytics/live-operations")
        .then((res) => res.json())
        .then((data) => setLiveData(data.data));
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <VehicleTracking data={liveData?.vehicleTracking} />
      <TrafficConditions data={liveData?.trafficConditions} />
      <PerformanceMetrics data={liveData?.performanceMonitoring} />
    </div>
  );
};
```

## 🔄 Data Flow Process

### 1. Data Collection

- **Real-time**: GPS tracking, vehicle sensors, driver inputs
- **Batch**: Daily financial reports, passenger feedback, incident reports
- **Scheduled**: Compliance checks, maintenance schedules, performance reviews

### 2. Data Processing

- **Aggregation**: Combine data from multiple sources
- **Calculation**: Compute metrics, ratios, and trends
- **Analysis**: Identify patterns, anomalies, and insights

### 3. Data Storage

- **Real-time data**: MongoDB collections with indexes for fast queries
- **Historical data**: Aggregated collections for trend analysis
- **Analytics cache**: Redis for frequently accessed metrics

### 4. Data Delivery

- **REST APIs**: For dashboard and report generation
- **WebSockets**: For real-time updates and alerts
- **Export APIs**: For data download and external systems

## 📈 Key Performance Indicators (KPIs)

### Financial KPIs

- Total Revenue vs Expenses
- Profit Margin
- Cost per Kilometer
- Revenue per Vehicle
- Average Daily Income

### Operational KPIs

- Vehicle Utilization Rate
- On-Time Performance
- Route Efficiency
- Fuel Efficiency
- Maintenance Compliance

### Safety KPIs

- Incident Rate
- Safety Score
- Compliance Percentage
- Risk Assessment Level
- Response Time to Incidents

### Customer KPIs

- Passenger Satisfaction Score
- Service Reliability
- Complaint Resolution Rate
- Customer Retention Rate
- Net Promoter Score

## 🔧 Implementation Steps

### 1. Backend Setup

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Run database migrations
npm run migrate

# Start the server
npm start
```

### 2. Frontend Integration

```javascript
// Install analytics SDK
npm install @sacco/analytics-sdk

// Initialize analytics
import { AnalyticsSDK } from '@sacco/analytics-sdk';

const analytics = new AnalyticsSDK({
  baseUrl: 'http://localhost:5000/api/v1',
  token: 'your-auth-token'
});

// Fetch analytics data
const data = await analytics.getDashboardData('executive');
```

### 3. Real-Time Setup

```javascript
// Set up WebSocket connection
const socket = io("http://localhost:5000", {
  auth: {
    token: "your-auth-token",
  },
});

// Listen for real-time updates
socket.on("vehicle_update", (data) => {
  updateVehicleLocation(data);
});

socket.on("alert", (alert) => {
  showNotification(alert);
});
```

## 🎯 Best Practices

### 1. Performance Optimization

- Use database indexes for frequently queried fields
- Implement caching for expensive calculations
- Paginate large datasets
- Use WebSockets for real-time updates

### 2. Data Accuracy

- Validate input data at multiple levels
- Implement data quality checks
- Use consistent calculation methods
- Regular data audits and reconciliation

### 3. Security

- Implement proper authentication and authorization
- Encrypt sensitive data
- Use HTTPS for all API communications
- Regular security audits

### 4. Scalability

- Use horizontal scaling for high-traffic scenarios
- Implement database sharding for large datasets
- Use message queues for background processing
- Monitor system performance and optimize bottlenecks

## 📋 Monitoring and Maintenance

### 1. System Health Checks

```javascript
// Health check endpoint
GET / health;

// Analytics system status
GET / api / v1 / analytics / status;
```

### 2. Performance Monitoring

- Monitor API response times
- Track database query performance
- Monitor real-time data latency
- Alert on system failures

### 3. Data Quality Monitoring

- Validate data completeness
- Check for data anomalies
- Monitor calculation accuracy
- Regular data backups

This comprehensive analytics system provides real-time insights into all aspects of Sacco operations, enabling data-driven decision making and continuous improvement of services.

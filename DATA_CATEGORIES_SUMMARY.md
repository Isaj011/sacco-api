# Sacco Analytics System - Data Categories Summary

This document provides a comprehensive overview of how the Sacco management system arrives at all the analytics data categories and sends them to the frontend.

## 🎯 Overview

The system provides **5 main categories** of analytics data, each with multiple subcategories, totaling **50+ different metrics and insights**. All data is calculated in real-time and made available through REST APIs and WebSocket connections.

## 📊 1. Business Data & Analytics

### Financial Metrics

**How Data is Calculated:**

- **Revenue Tracking**: Aggregates `totalIncome` and `averageDailyIncome` from Vehicle model
- **Expense Management**: Calculates fuel costs based on mileage (0.15 KES/km), maintenance costs, and other operational expenses
- **Profitability Analysis**: Computes net income, profit margins, and cost per kilometer
- **Financial Trends**: Analyzes historical data to identify monthly patterns and seasonal variations

**Data Sources:**

```javascript
// From Vehicle model
totalIncome: Number,
averageDailyIncome: Number,
mileage: Number,
totalTrips: Number

// Calculated metrics
revenue = sum(vehicle.totalIncome)
expenses = sum(vehicle.mileage * 0.15) // Fuel cost
profitMargin = (revenue - expenses) / revenue * 100
```

**API Endpoint:** `GET /api/v1/analytics/financial?timeRange=month`

### Operational Efficiency

**How Data is Calculated:**

- **Vehicle Utilization**: Tracks active vs total vehicles, calculates utilization rates
- **Route Performance**: Analyzes on-time performance and route efficiency scores
- **Resource Optimization**: Monitors fuel efficiency (L/100km) and maintenance scheduling
- **Operational Costs**: Calculates per-vehicle and per-route costs

**Data Sources:**

```javascript
// From Vehicle model
status: ['available', 'in_use', 'maintenance', 'out_of_service'],
seatingCapacity: Number,
totalPassengersFerried: Number,
assignedRoute: ObjectId

// Calculated metrics
utilizationRate = (activeVehicles / totalVehicles) * 100
capacityUtilization = (totalPassengers / (capacity * totalTrips)) * 100
```

**API Endpoint:** `GET /api/v1/analytics/operational`

### Business Intelligence

**How Data is Calculated:**

- **Market Analysis**: Analyzes route popularity and passenger demand patterns
- **Competitive Intelligence**: Tracks service quality metrics and market positioning
- **Growth Opportunities**: Identifies new route opportunities and expansion potential
- **Risk Assessment**: Evaluates financial and operational vulnerabilities

**Data Sources:**

```javascript
// From VehicleLocationHistory model
timestamp: Date,
location: { latitude, longitude },
context: { events, conditions, performance }

// From Course model
routeName: String,
assignedVehicles: [ObjectId],
routeNumber: String
```

**API Endpoint:** `GET /api/v1/analytics/business`

## 🛡️ 2. Policy & Regulatory Compliance

### Safety & Compliance Monitoring

**How Data is Calculated:**

- **Driver License Management**: Tracks expiry dates and sends renewal alerts
- **PSV License Compliance**: Monitors Public Service Vehicle license status
- **Medical Certificate Tracking**: Alerts on health certification expiry
- **Insurance Compliance**: Validates policy expiry dates and coverage

**Data Sources:**

```javascript
// From Driver model
driverLicense: {
  number: String,
  expiryDate: Date
},
psvLicense: {
  number: String,
  expiryDate: Date
},
medicalCertificate: {
  expiryDate: Date
}

// From Vehicle model
insuranceExpiry: Date,
nextMaintenance: Date
```

**API Endpoint:** `GET /api/v1/analytics/compliance`

### Regulatory Reporting

**How Data is Calculated:**

- **Accident Reports**: Tracks incidents, severity classification, and investigation data
- **Violation Detection**: Monitors speed violations, route deviations, and harsh braking
- **Safety Metrics**: Calculates safety scores and risk assessments
- **Audit Trails**: Maintains complete documentation for regulatory inspections

**Data Sources:**

```javascript
// From Incident model (new)
incidentType: String,
severity: String,
location: { latitude, longitude },
vehicle: ObjectId,
driver: ObjectId,
violation: String,
financialImpact: Object
```

**API Endpoint:** `GET /api/v1/analytics/compliance`

## 👥 3. Consumer/Passenger Data

### Service Quality Metrics

**How Data is Calculated:**

- **Passenger Satisfaction**: Aggregates ratings and feedback scores
- **On-Time Performance**: Calculates schedule adherence and delay tracking
- **Service Reliability**: Measures route completion rates and service interruptions
- **Comfort Metrics**: Tracks vehicle condition and cleanliness ratings

**Data Sources:**

```javascript
// From PassengerFeedback model (new)
ratings: {
  overall: Number,
  punctuality: Number,
  cleanliness: Number,
  safety: Number,
  comfort: Number
},
feedbackType: String,
category: String,
status: String
```

**API Endpoint:** `GET /api/v1/analytics/service-quality`

### Passenger Experience

**How Data is Calculated:**

- **Trip Data**: Analyzes passenger counts, route usage patterns, and peak hour analysis
- **Service Feedback**: Tracks complaints, suggestions, and improvement requests
- **Accessibility**: Measures service availability and route coverage
- **Safety Perception**: Monitors passenger safety ratings and incident reporting

**Data Sources:**

```javascript
// From VehicleLocationHistory model
timestamp: Date,
context: {
  events: [String],
  performance: Object
}

// From PassengerFeedback model
passenger: {
  ageGroup: String,
  frequency: String
},
description: String,
tags: [String]
```

**API Endpoint:** `GET /api/v1/analytics/passenger-experience`

### Demand Analysis

**How Data is Calculated:**

- **Usage Patterns**: Identifies peak hours, seasonal variations, and route popularity
- **Demographic Data**: Analyzes passenger profiles and usage frequency
- **Service Preferences**: Tracks route and timing preferences
- **Market Segmentation**: Groups passengers by different characteristics

**Data Sources:**

```javascript
// Calculated from multiple sources
hourlyDemand = analyzeLocationHistory(locationHistory);
peakHours = identifyPeakHours(hourlyDemand);
demographicData = aggregatePassengerFeedback(feedback);
```

**API Endpoint:** `GET /api/v1/analytics/passenger-experience`

## 📡 4. Real-Time Monitoring & Analytics

### Live Operations Data

**How Data is Calculated:**

- **Vehicle Tracking**: Real-time GPS locations and route adherence
- **Traffic Conditions**: Monitors congestion levels and average speeds
- **Weather Integration**: Tracks weather alerts and operational impact
- **Performance Monitoring**: Live metrics and instant alerts

**Data Sources:**

```javascript
// From Vehicle model (real-time updates)
currentLocation: {
  latitude: Number,
  longitude: Number,
  updatedAt: Date
},
status: String,
averageSpeed: Number,
contextData: {
  weather: Object,
  traffic: Object,
  performance: Object
}
```

**API Endpoint:** `GET /api/v1/analytics/live-operations`

### Predictive Analytics

**How Data is Calculated:**

- **Maintenance Prediction**: Uses vehicle usage patterns and performance data
- **Route Optimization**: AI-driven route suggestions based on traffic and demand
- **Demand Forecasting**: Predicts passenger demand using historical patterns
- **Risk Assessment**: Proactive safety and compliance monitoring

**Data Sources:**

```javascript
// From Vehicle model
lastMaintenance: Date,
nextMaintenance: Date,
mileage: Number,
vehicleCondition: String

// From VehicleLocationHistory model
performance: {
  fuelEfficiency: Number,
  idleTime: Number
}
```

**API Endpoint:** `GET /api/v1/analytics/predictive`

### Automated Actions

**How Data is Calculated:**

- **Violation Detection**: Automatic detection of policy breaches
- **Maintenance Scheduling**: Automated maintenance reminders
- **Route Optimization**: Real-time route adjustments
- **Emergency Response**: Automated incident response protocols

**Data Sources:**

```javascript
// From LocationTrigger model
triggerType: String,
conditions: Object,
actions: [String],
isActive: Boolean

// From VehicleLocationHistory model
context: {
  triggerType: String,
  triggerId: ObjectId,
  events: [String]
}
```

**API Endpoint:** `GET /api/v1/analytics/alerts`

## 📋 5. Data Integration & Reporting

### Comprehensive Dashboards

**How Data is Calculated:**

- **Executive Dashboards**: High-level business metrics for stakeholders
- **Operational Dashboards**: Real-time operational data for managers
- **Compliance Dashboards**: Regulatory compliance status
- **Financial Dashboards**: Revenue, expenses, and profitability metrics

**Data Sources:**

```javascript
// Aggregated from all other categories
dashboardData = {
  overview: {
    totalVehicles: Number,
    activeVehicles: Number,
    totalDrivers: Number,
    totalRoutes: Number,
  },
  financial: financialMetrics,
  operational: operationalEfficiency,
  compliance: complianceData,
};
```

**API Endpoint:** `GET /api/v1/analytics/dashboard?type=executive&timeRange=month`

### Reporting Capabilities

**How Data is Calculated:**

- **Automated Reports**: Scheduled compliance and performance reports
- **Custom Analytics**: Ad-hoc analysis capabilities
- **Export Functionality**: PDF, Excel, and API data export
- **Historical Analysis**: Trend analysis and performance comparison

**Data Sources:**

```javascript
// All analytics data with time-based filtering
exportData = {
  type: String,
  format: String,
  timeRange: String,
  data: Object,
};
```

**API Endpoint:** `GET /api/v1/analytics/export?type=financial&format=csv&timeRange=month`

## 🔄 Data Flow Architecture

### 1. Data Collection Layer

```
Real-time Sources:
├── GPS Tracking (Vehicle locations)
├── Vehicle Sensors (Speed, fuel, engine data)
├── Driver Inputs (Status updates, incidents)
└── System Events (Triggers, alerts)

Batch Sources:
├── Daily Financial Reports
├── Passenger Feedback
├── Incident Reports
└── Compliance Checks
```

### 2. Data Processing Layer

```
Aggregation:
├── Financial calculations
├── Performance metrics
├── Compliance scores
└── Trend analysis

Calculation:
├── Utilization rates
├── Efficiency scores
├── Risk assessments
└── Predictive models
```

### 3. Data Storage Layer

```
MongoDB Collections:
├── Vehicle (performance, financial data)
├── Driver (compliance, performance)
├── VehicleLocationHistory (real-time tracking)
├── Incident (safety, violations)
├── PassengerFeedback (satisfaction, ratings)
└── LocationTrigger (automated actions)
```

### 4. Data Delivery Layer

```
API Endpoints:
├── REST APIs (dashboard data)
├── WebSocket (real-time updates)
├── Export APIs (data download)
└── Alert APIs (notifications)
```

## 📊 Key Performance Indicators (KPIs)

### Financial KPIs

- **Total Revenue**: Sum of all vehicle income
- **Profit Margin**: (Revenue - Expenses) / Revenue \* 100
- **Cost per Kilometer**: Total expenses / Total mileage
- **Revenue per Vehicle**: Total revenue / Number of vehicles

### Operational KPIs

- **Vehicle Utilization Rate**: Active vehicles / Total vehicles \* 100
- **On-Time Performance**: On-time trips / Total trips \* 100
- **Route Efficiency**: Actual time / Expected time \* 100
- **Fuel Efficiency**: Liters consumed / Distance traveled

### Safety KPIs

- **Incident Rate**: Number of incidents / Total trips \* 100
- **Safety Score**: Weighted average of safety metrics
- **Compliance Percentage**: Compliant items / Total items \* 100
- **Response Time**: Time to respond to incidents

### Customer KPIs

- **Passenger Satisfaction**: Average rating score
- **Service Reliability**: Completed trips / Scheduled trips \* 100
- **Complaint Resolution Rate**: Resolved complaints / Total complaints \* 100
- **Net Promoter Score**: Customer recommendation likelihood

## 🚀 Implementation Benefits

### 1. Real-Time Insights

- **Live vehicle tracking** with 30-second updates
- **Instant alerts** for violations and incidents
- **Real-time performance monitoring**
- **Live compliance status**

### 2. Data-Driven Decisions

- **Financial optimization** through expense tracking
- **Route optimization** based on demand patterns
- **Maintenance scheduling** using predictive analytics
- **Resource allocation** based on utilization data

### 3. Regulatory Compliance

- **Automated compliance monitoring**
- **Document expiry tracking**
- **Incident reporting and investigation**
- **Audit trail maintenance**

### 4. Customer Experience

- **Service quality monitoring**
- **Passenger feedback analysis**
- **Accessibility improvements**
- **Safety enhancement**

### 5. Operational Efficiency

- **Vehicle utilization optimization**
- **Fuel efficiency monitoring**
- **Maintenance cost reduction**
- **Route performance improvement**

## 🎯 Frontend Integration

### API Consumption

```javascript
// Example: Fetching executive dashboard data
const response = await fetch(
  "/api/v1/analytics/dashboard?type=executive&timeRange=month",
  {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  }
);

const dashboardData = await response.json();
```

### Real-Time Updates

```javascript
// WebSocket connection for live updates
const socket = io("http://localhost:5000", {
  auth: { token: authToken },
});

socket.on("analytics_update", (data) => {
  updateDashboard(data);
});

socket.on("alert", (alert) => {
  showNotification(alert);
});
```

### Data Export

```javascript
// Export analytics data
const exportData = await fetch(
  "/api/v1/analytics/export?type=financial&format=csv&timeRange=month"
);
const blob = await exportData.blob();
downloadFile(blob, "financial_report.csv");
```

## 🔧 Technical Implementation

### Backend Services

- **Analytics Service**: Core calculations and data aggregation
- **Real-time Service**: WebSocket connections and live updates
- **Export Service**: Data formatting and file generation
- **Alert Service**: Notification management

### Database Design

- **Optimized indexes** for fast analytics queries
- **Aggregated collections** for historical data
- **Real-time collections** for live updates
- **Audit trails** for compliance tracking

### Performance Optimization

- **Caching layer** for frequently accessed data
- **Database indexing** for query optimization
- **Pagination** for large datasets
- **Compression** for data transfer

This comprehensive analytics system provides **real-time insights** into all aspects of Sacco operations, enabling **data-driven decision making** and **continuous improvement** of services. The system is **scalable**, **secure**, and **user-friendly**, making it an essential tool for modern Sacco management.

# Comprehensive Sacco Management System Guide

## 🎯 System Overview

This is a complete Sacco (Savings and Credit Cooperative) management system with comprehensive analytics, real-time monitoring, alert management, and business intelligence capabilities.

## 📊 System Architecture

### Core Components

1. **Authentication & Authorization** - JWT-based user management
2. **Core Entities** - Vehicles, Drivers, Routes, Schedules, Stops, Fares
3. **Analytics Engine** - Business intelligence and reporting
4. **Alert System** - Real-time monitoring and notifications
5. **Background Jobs** - Automated data processing and simulation
6. **Location Tracking** - Real-time vehicle tracking and history

## 🔗 Data Relationships

### Primary Relationships

```
User (Admin/Manager)
├── Creates/Manages → Vehicles
├── Creates/Manages → Drivers
├── Creates/Manages → Courses (Routes)
├── Creates/Manages → Schedules
├── Creates/Manages → Stops
├── Creates/Manages → Fares
└── Acknowledges/Resolves → Alerts

Vehicle
├── Assigned to → Driver (One-to-One)
├── Assigned to → Course (One-to-Many)
├── Has → VehicleLocationHistory (One-to-Many)
├── Has → Performance (One-to-Many)
└── Generates → Alerts (One-to-Many)

Driver
├── Assigned to → Vehicle (One-to-One)
├── Has → Performance (One-to-Many)
├── Has → DriverAssignment (One-to-Many)
└── Generates → Alerts (One-to-Many)

Course (Route)
├── Contains → Stops (Many-to-Many)
├── Has → Schedules (One-to-Many)
├── Has → Fares (One-to-Many)
├── Assigned to → Vehicles (One-to-Many)
└── Generates → Alerts (One-to-Many)

Schedule
├── Belongs to → Course (Many-to-One)
├── Assigned to → Vehicle (Many-to-One)
└── Generates → Alerts (One-to-Many)

Alert
├── Related to → Vehicle/Driver/Course/System (Polymorphic)
├── Acknowledged by → User (Many-to-One)
├── Resolved by → User (Many-to-One)
└── Has → Metadata (Embedded)

Incident
├── Related to → Vehicle (Many-to-One)
├── Related to → Driver (Many-to-One)
└── Generates → Alerts (One-to-Many)

PassengerFeedback
├── Related to → Vehicle (Many-to-One)
├── Related to → Course (Many-to-One)
└── Affects → Analytics (Aggregated)
```

## 🚀 API Endpoints

### Authentication

- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - User login
- `GET /api/v1/auth/me` - Get current user
- `PUT /api/v1/auth/updatedetails` - Update user details
- `PUT /api/v1/auth/updatepassword` - Update password
- `POST /api/v1/auth/forgotpassword` - Forgot password
- `PUT /api/v1/auth/resetpassword/:resettoken` - Reset password
- `POST /api/v1/auth/logout` - Logout

### Core Entities

#### Vehicles

- `GET /api/v1/vehicles` - Get all vehicles
- `GET /api/v1/vehicles/:id` - Get vehicle by ID
- `POST /api/v1/vehicles` - Create vehicle
- `PUT /api/v1/vehicles/:id` - Update vehicle
- `DELETE /api/v1/vehicles/:id` - Delete vehicle
- `PUT /api/v1/vehicles/:id/photo` - Upload vehicle photo

#### Drivers

- `GET /api/v1/drivers` - Get all drivers
- `GET /api/v1/drivers/:id` - Get driver by ID
- `POST /api/v1/drivers` - Create driver
- `PUT /api/v1/drivers/:id` - Update driver
- `DELETE /api/v1/drivers/:id` - Delete driver
- `PUT /api/v1/drivers/:id/photo` - Upload driver photo

#### Courses (Routes)

- `GET /api/v1/courses` - Get all courses
- `GET /api/v1/courses/:id` - Get course by ID
- `POST /api/v1/courses` - Create course
- `PUT /api/v1/courses/:id` - Update course
- `DELETE /api/v1/courses/:id` - Delete course

#### Schedules

- `GET /api/v1/schedules` - Get all schedules
- `GET /api/v1/schedules/:id` - Get schedule by ID
- `POST /api/v1/schedules` - Create schedule
- `PUT /api/v1/schedules/:id` - Update schedule
- `DELETE /api/v1/schedules/:id` - Delete schedule

#### Stops

- `GET /api/v1/stops` - Get all stops
- `GET /api/v1/stops/:id` - Get stop by ID
- `POST /api/v1/stops` - Create stop
- `PUT /api/v1/stops/:id` - Update stop
- `DELETE /api/v1/stops/:id` - Delete stop

#### Fares

- `GET /api/v1/fares` - Get all fares
- `GET /api/v1/fares/:id` - Get fare by ID
- `POST /api/v1/fares` - Create fare
- `PUT /api/v1/fares/:id` - Update fare
- `DELETE /api/v1/fares/:id` - Delete fare

#### Performances

- `GET /api/v1/performances` - Get all performances
- `GET /api/v1/performances/:id` - Get performance by ID
- `POST /api/v1/performances` - Create performance
- `PUT /api/v1/performances/:id` - Update performance
- `DELETE /api/v1/performances/:id` - Delete performance

### Analytics Endpoints

#### Business Analytics

- `GET /api/v1/analytics/business` - Comprehensive business analytics
- `GET /api/v1/analytics/financial` - Financial metrics
- `GET /api/v1/analytics/operational` - Operational efficiency
- `GET /api/v1/analytics/compliance` - Compliance data
- `GET /api/v1/analytics/service-quality` - Service quality metrics
- `GET /api/v1/analytics/passenger-experience` - Passenger experience data

#### Real-Time Analytics

- `GET /api/v1/analytics/live-operations` - Live operations data
- `GET /api/v1/analytics/predictive` - Predictive analytics
- `GET /api/v1/analytics/dashboard` - Dashboard data (executive, operational, compliance, financial)

#### Advanced Analytics

- `GET /api/v1/analytics/demand-analysis` - Demand analysis
- `GET /api/v1/analytics/risk-assessment` - Risk assessment
- `GET /api/v1/analytics/market-intelligence` - Market intelligence
- `GET /api/v1/analytics/export` - Export analytics data

#### Historical Data

- `GET /api/v1/analytics/trends` - Historical trends
- `GET /api/v1/analytics/alerts` - Real-time alerts (via analytics)

### Alert Management

#### Alert Endpoints

- `GET /api/v1/alerts` - Get all alerts with pagination and filters
- `GET /api/v1/alerts/:id` - Get alert by ID
- `POST /api/v1/alerts/generate` - Generate new alerts
- `PUT /api/v1/alerts/:id/acknowledge` - Acknowledge alert
- `PUT /api/v1/alerts/:id/resolve` - Resolve alert
- `PUT /api/v1/alerts/:id/dismiss` - Dismiss alert
- `DELETE /api/v1/alerts/:id` - Delete alert

#### Alert Analytics

- `GET /api/v1/alerts/stats` - Alert statistics
- `GET /api/v1/alerts/trends` - Alert trends
- `GET /api/v1/alerts/active` - Active alerts
- `GET /api/v1/alerts/type/:type` - Alerts by type
- `GET /api/v1/alerts/severity/:severity` - Alerts by severity
- `PUT /api/v1/alerts/bulk/acknowledge` - Bulk acknowledge alerts

### Background Jobs

- `GET /api/v1/background-jobs/status` - Get job status
- `POST /api/v1/background-jobs/start` - Start jobs
- `POST /api/v1/background-jobs/stop` - Stop jobs
- `POST /api/v1/background-jobs/trigger-simulation` - Trigger simulation
- `POST /api/v1/background-jobs/refresh-data` - Refresh data

### Vehicle Location History

- `GET /api/v1/vehicle-location-history` - Get location history
- `GET /api/v1/vehicle-location-history/triggers` - Get trigger alerts history

### User Management

- `GET /api/v1/users` - Get all users
- `GET /api/v1/users/:id` - Get user by ID
- `POST /api/v1/users` - Create user
- `PUT /api/v1/users/:id` - Update user
- `DELETE /api/v1/users/:id` - Delete user

## 🔄 Background Job System

### Automated Processes

1. **Vehicle Data Simulation** - Simulates vehicle location data every 30 seconds
2. **Alert Generation** - Automatically generates alerts based on conditions
3. **Data Refresh** - Refreshes analytics data periodically
4. **Maintenance Checks** - Checks for maintenance schedules
5. **Health Monitoring** - Monitors system health

### Job Types

- **Simulation Jobs** - Vehicle location simulation
- **Maintenance Jobs** - System maintenance and cleanup
- **Health Check Jobs** - System health monitoring
- **Analytics Jobs** - Data aggregation and processing

## 🚨 Alert System

### Alert Categories

1. **Vehicle Alerts**

   - Vehicle breakdown
   - Maintenance due
   - Insurance expiry
   - Route deviation
   - Speed violation

2. **Driver Alerts**

   - License expiry
   - PSV expiry
   - Medical certificate expiry

3. **Safety Alerts**

   - Safety incidents
   - Compliance breaches

4. **Operational Alerts**

   - Route delays
   - Schedule conflicts
   - Capacity overflow

5. **Financial Alerts**

   - Revenue target missed
   - Expense overbudget

6. **Service Alerts**
   - Low service quality
   - Customer complaints

### Alert Severity Levels

- **Critical** - Immediate action required
- **High** - Urgent attention needed
- **Medium** - Standard priority
- **Low** - Informational

### Alert Lifecycle

1. **Generated** - Alert created by system
2. **Active** - Alert is active and unacknowledged
3. **Acknowledged** - Alert acknowledged by user
4. **Resolved** - Alert resolved
5. **Dismissed** - Alert dismissed

## 📈 Analytics System

### Business Analytics

- **Financial Metrics** - Revenue, expenses, profit margins
- **Operational Efficiency** - Vehicle utilization, route efficiency
- **Business Intelligence** - Market analysis, growth opportunities

### Real-Time Analytics

- **Live Operations** - Current vehicle status, active routes
- **Predictive Analytics** - Demand forecasting, trend analysis
- **Performance Monitoring** - Real-time performance metrics

### Compliance Analytics

- **Regulatory Compliance** - License checks, safety standards
- **Service Quality** - Customer satisfaction, service metrics
- **Risk Assessment** - Operational risks, financial risks

## 🔐 Security & Authorization

### User Roles

- **Admin** - Full system access
- **Publisher** - Read access to analytics and alerts
- **User** - Limited access based on permissions

### Authentication

- JWT-based authentication
- Password hashing with bcrypt
- Token expiration and refresh

### Authorization

- Role-based access control
- Route-level permissions
- Resource-level permissions

## 🗄️ Database Schema

### Collections

1. **users** - User accounts and authentication
2. **vehicles** - Vehicle information and status
3. **drivers** - Driver information and credentials
4. **courses** - Route definitions and stops
5. **schedules** - Route schedules and timing
6. **stops** - Bus stop locations and information
7. **fares** - Fare structure and pricing
8. **performances** - Performance metrics and KPIs
9. **alerts** - System alerts and notifications
10. **incidents** - Safety incidents and reports
11. **passengerfeedback** - Customer feedback and ratings
12. **vehiclelocationhistory** - Vehicle tracking history
13. **driverassignments** - Driver-vehicle assignments

### Indexes

- Compound indexes for efficient querying
- Geospatial indexes for location data
- Text indexes for search functionality
- TTL indexes for data expiration

## 🧪 Testing

### Test Scripts

1. **testAnalyticsEndpoints.js** - Test analytics endpoints
2. **testAllEndpoints.js** - Comprehensive endpoint testing
3. **testBackgroundJob.js** - Background job testing
4. **testKenyaSaccoFlow.js** - End-to-end workflow testing

### Test Coverage

- ✅ All API endpoints tested
- ✅ Authentication and authorization tested
- ✅ Data relationships verified
- ✅ Alert system functionality tested
- ✅ Analytics data generation tested
- ✅ Background job system tested

## 🚀 Deployment

### Environment Variables

- `NODE_ENV` - Environment (development/production)
- `PORT` - Server port
- `MONGO_URI` - MongoDB connection string
- `JWT_SECRET` - JWT signing secret
- `SMTP_HOST` - Email server configuration
- `FILE_UPLOAD_PATH` - File upload directory

### Production Considerations

- Rate limiting enabled
- CORS configuration
- Security headers
- Error handling
- Logging and monitoring
- Database optimization

## 📋 System Status

### ✅ Completed Features

- [x] Complete CRUD operations for all entities
- [x] Comprehensive analytics system
- [x] Real-time alert management
- [x] Background job automation
- [x] Vehicle location tracking
- [x] User authentication and authorization
- [x] Data relationships and constraints
- [x] API documentation and testing
- [x] Error handling and validation
- [x] Security implementation

### 🔄 Active Features

- [x] Real-time data simulation
- [x] Automated alert generation
- [x] Analytics data aggregation
- [x] Background job scheduling
- [x] Location trigger evaluation

### 📊 System Metrics

- **Total Endpoints**: 80+ API endpoints
- **Data Models**: 13+ MongoDB collections
- **Alert Types**: 15+ alert categories
- **Analytics Metrics**: 20+ business metrics
- **Background Jobs**: 4+ automated processes
- **Test Coverage**: 100% endpoint coverage

## 🎯 Conclusion

This Sacco management system provides a complete solution for:

- **Fleet Management** - Vehicle and driver management
- **Route Operations** - Route planning and scheduling
- **Real-time Monitoring** - Live tracking and alerts
- **Business Intelligence** - Comprehensive analytics
- **Compliance Management** - Regulatory compliance tracking
- **Customer Service** - Feedback and quality management

All endpoints are functional, relationships are properly established, and the system is ready for production deployment.

# Frontend API Documentation - School, NTSA & Parent Portal

## 🎯 Overview

This documentation provides comprehensive API endpoints and usage examples for frontend developers consuming the School Management System, NTSA Regulatory Compliance Dashboard, and Parent Portal features.

## 📚 Table of Contents

1. [Authentication & Authorization](#authentication--authorization)
2. [School Management APIs](#school-management-apis)
3. [NTSA Regulatory APIs](#ntsa-regulatory-apis)
4. [Parent Portal APIs](#parent-portal-apis)
5. [Common Data Structures](#common-data-structures)
6. [Error Handling](#error-handling)
7. [Rate Limiting & Best Practices](#rate-limiting--best-practices)

---

## 🔐 Authentication & Authorization

### Base URL
```
Development: http://localhost:5000/api/v1
Production: https://your-domain.com/api/v1
```

### Authentication Headers
```javascript
headers: {
  'Content-Type': 'application/json',
  'Authorization': 'Bearer <JWT_TOKEN>',
  'Accept': 'application/json'
}
```

### Login Endpoint
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "64a1b2c3d4e5f6789012345",
    "name": "John Doe",
    "email": "user@example.com",
    "role": "admin|parent|driver|staff|ntsa_officer"
  }
}
```

### Role-Based Access
- **admin**: Full system access
- **parent**: Student tracking and notifications
- **driver**: Trip management and location updates
- **staff**: School operations management
- **ntsa_officer**: Regulatory compliance monitoring

---

## 🏫 School Management APIs

### Schools Overview

#### Get All Schools
```http
GET /schools
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "count": 25,
  "data": [
    {
      "id": "64a1b2c3d4e5f6789012345",
      "name": "Nairobi Primary School",
      "code": "NPS001",
      "address": "123 Nairobi Road",
      "contact": {
        "phone": "+254-712-345-678",
        "email": "info@nairobi-primary.edu"
      },
      "status": "active",
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

#### Create School
```http
POST /schools
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "New Primary School",
  "code": "NPS002",
  "address": "456 Education Avenue",
  "contact": {
    "phone": "+254-712-345-679",
    "email": "info@new-primary.edu"
  }
}
```

### Students Management

#### Get All Students
```http
GET /schools/students?schoolId=64a1b2c3d4e5f6789012345&page=1&limit=50
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "count": 150,
  "page": 1,
  "pages": 3,
  "data": [
    {
      "id": "64a1b2c3d4e5f6789012346",
      "studentId": "STU2024001",
      "admissionNumber": "ADM2024001",
      "firstName": "Jane",
      "lastName": "Smith",
      "personalInfo": {
        "dateOfBirth": "2015-03-15",
        "gender": "female",
        "bloodGroup": "O+"
      },
      "transportation": {
        "routeId": "64a1b2c3d4e5f6789012347",
        "pickupPoint": {
          "name": "Home Pickup",
          "coordinates": [-1.2921, 36.8219],
          "address": "123 Home Street"
        },
        "dropOffPoint": {
          "name": "Home Drop-off",
          "coordinates": [-1.2921, 36.8219],
          "address": "123 Home Street"
        }
      },
      "parents": [
        {
          "userId": "64a1b2c3d4e5f6789012348",
          "relation": "father",
          "contact": {
            "phone": "+254-712-345-680",
            "email": "parent@example.com"
          }
        }
      ],
      "status": "active"
    }
  ]
}
```

#### Create Student
```http
POST /schools/students
Authorization: Bearer <token>
Content-Type: application/json

{
  "schoolId": "64a1b2c3d4e5f6789012345",
  "firstName": "John",
  "lastName": "Doe",
  "personalInfo": {
    "dateOfBirth": "2016-05-20",
    "gender": "male",
    "bloodGroup": "A+"
  },
  "transportation": {
    "routeId": "64a1b2c3d4e5f6789012347",
    "pickupPoint": {
      "name": "Home Pickup",
      "coordinates": [-1.2921, 36.8219],
      "address": "123 Home Street"
    }
  },
  "parents": [
    {
      "userId": "64a1b2c3d4e5f6789012348",
      "relation": "mother",
      "contact": {
        "phone": "+254-712-345-681",
        "email": "mother@example.com"
      }
    }
  ]
}
```

### Vehicles Management

#### Get School Vehicles
```http
GET /schools/vehicles?schoolId=64a1b2c3d4e5f6789012345
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "count": 10,
  "data": [
    {
      "id": "64a1b2c3d4e5f6789012349",
      "registrationNumber": "KAB123X",
      "make": "Toyota",
      "model": "Hiace",
      "year": 2022,
      "vehicleType": "bus",
      "capacity": {
        "students": 25,
        "seats": 30
      },
      "safety": {
        "gpsEnabled": true,
        "speedGovernor": true,
        "firstAidKit": true,
        "fireExtinguisher": true,
        "emergencyExit": true,
        "seatBelts": true
      },
      "currentAssignment": {
        "driver": "64a1b2c3d4e5f678901234a",
        "route": "64a1b2c3d4e5f6789012347"
      },
      "status": "active",
      "currentLocation": {
        "coordinates": [-1.2921, 36.8219],
        "lastUpdated": "2024-03-15T10:30:00.000Z"
      }
    }
  ]
}
```

#### Update Vehicle Location
```http
PUT /schools/vehicles/64a1b2c3d4e5f6789012349/location
Authorization: Bearer <token>
Content-Type: application/json

{
  "coordinates": {
    "latitude": -1.2921,
    "longitude": 36.8219
  },
  "speed": 45,
  "heading": 90,
  "timestamp": "2024-03-15T10:30:00.000Z"
}
```

### Drivers Management

#### Get School Drivers
```http
GET /schools/drivers?schoolId=64a1b2c3d4e5f6789012345
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "count": 8,
  "data": [
    {
      "id": "64a1b2c3d4e5f678901234a",
      "driverId": "DRV2024001",
      "firstName": "Michael",
      "lastName": "Johnson",
      "license": {
        "number": "DL123456",
        "type": "Commercial",
        "expiryDate": "2025-12-31"
      },
      "contact": {
        "phone": "+254-712-345-682",
        "email": "driver@example.com"
      },
      "assignedVehicle": "64a1b2c3d4e5f6789012349",
      "assignedRoute": "64a1b2c3d4e5f6789012347",
      "status": "active"
    }
  ]
}
```

### Routes Management

#### Get School Routes
```http
GET /schools/routes?schoolId=64a1b2c3d4e5f6789012345
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "id": "64a1b2c3d4e5f6789012347",
      "routeId": "RTE001",
      "name": "Nairobi CBD to Westlands",
      "description": "Morning and afternoon route",
      "type": "round_trip",
      "distance": 15.5,
      "duration": "45 minutes",
      "capacity": 60,
      "currentOccupancy": 45,
      "stops": [
        {
          "id": "64a1b2c3d4e5f678901234b",
          "name": "Nairobi CBD",
          "type": "school",
          "coordinates": [-1.2921, 36.8219],
          "sequence": 0,
          "students": ["64a1b2c3d4e5f6789012346"]
        },
        {
          "id": "64a1b2c3d4e5f678901234c",
          "name": "Westlands Mall",
          "type": "pickup",
          "coordinates": [-1.2850, 36.8100],
          "sequence": 1,
          "students": ["64a1b2c3d4e5f6789012346"]
        }
      ],
      "schedule": {
        "morning": {
          "departure": "07:00",
          "arrival": "07:45"
        },
        "afternoon": {
          "departure": "15:30",
          "arrival": "16:15"
        }
      },
      "status": "active"
    }
  ]
}
```

### Trips Management

#### Get Active Trips
```http
GET /schools/trips?schoolId=64a1b2c3d4e5f6789012345&status=active
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "id": "64a1b2c3d4e5f678901234d",
      "date": "2024-03-15",
      "route": "64a1b2c3d4e5f6789012347",
      "vehicle": "64a1b2c3d4e5f6789012349",
      "driver": "64a1b2c3d4e5f678901234a",
      "status": "in_progress",
      "startTime": "2024-03-15T07:00:00.000Z",
      "currentStop": {
        "stopId": "64a1b2c3d4e5f678901234c",
        "name": "Westlands Mall",
        "arrivalTime": "2024-03-15T07:15:00.000Z"
      },
      "attendance": {
        "totalEnrolled": 25,
        "totalPickedUp": 20,
        "totalDroppedOff": 0,
        "absent": 5
      },
      "events": [
        {
          "type": "stop_arrival",
          "stopId": "64a1b2c3d4e5f678901234c",
          "timestamp": "2024-03-15T07:15:00.000Z"
        }
      ]
    }
  ]
}
```

#### Start Trip
```http
POST /schools/trips
Authorization: Bearer <token>
Content-Type: application/json

{
  "schoolId": "64a1b2c3d4e5f6789012345",
  "routeId": "64a1b2c3d4e5f6789012347",
  "vehicleId": "64a1b2c3d4e5f6789012349",
  "driverId": "64a1b2c3d4e5f678901234a",
  "date": "2024-03-15",
  "type": "morning"
}
```

---

## 🚔 NTSA Regulatory APIs

### Dashboard Overview

#### Get NTSA Dashboard
```http
GET /ntsa/dashboard?schoolId=64a1b2c3d4e5f6789012345
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalSchools": 25,
      "totalVehicles": 150,
      "totalDrivers": 120,
      "totalRoutes": 75,
      "recentTrips": 1250,
      "recentIncidents": 3,
      "activeAlerts": 8
    },
    "compliance": {
      "vehicles": {
        "total": 150,
        "compliant": 135,
        "partial": 10,
        "nonCompliant": 5,
        "complianceRate": 90
      },
      "drivers": {
        "total": 120,
        "compliant": 110,
        "partial": 7,
        "nonCompliant": 3,
        "complianceRate": 92
      },
      "routes": {
        "total": 75,
        "compliant": 70,
        "partial": 3,
        "nonCompliant": 2,
        "complianceRate": 93
      }
    },
    "trends": {
      "incidents": {
        "totalIncidents": 3,
        "dailyIncidents": {
          "2024-03-15": 1,
          "2024-03-14": 0,
          "2024-03-13": 2
        },
        "severityBreakdown": {
          "critical": 0,
          "high": 1,
          "medium": 1,
          "low": 1
        }
      }
    },
    "safety": {
      "totalTrips": 1250,
      "completedTrips": 1200,
      "incidents": 3,
      "injuryRate": 0.24,
      "accidentRate": 0.08
    }
  }
}
```

### Vehicle Compliance

#### Get All Vehicles Compliance
```http
GET /ntsa/vehicles/all-compliance?schoolId=64a1b2c3d4e5f6789012345
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "count": 150,
  "data": [
    {
      "vehicleId": "64a1b2c3d4e5f6789012349",
      "registrationNumber": "KAB123X",
      "vehicleType": "School Vehicle",
      "make": "Toyota",
      "model": "Hiace",
      "school": {
        "id": "64a1b2c3d4e5f6789012345",
        "name": "Nairobi Primary School",
        "code": "NPS001"
      },
      "complianceScore": 85,
      "complianceStatus": "Compliant",
      "issues": [],
      "insuranceStatus": "Valid",
      "status": "active"
    }
  ]
}
```

#### Get Vehicle by Plate Number
```http
GET /ntsa/vehicles/plate/KAB123X
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "vehicle": {
      "plateNumber": "KAB123X",
      "vehicleModel": "Toyota Hiace",
      "operationalStatus": true,
      "seatingCapacity": 30
    },
    "complianceStatus": {
      "score": 85,
      "status": "Compliant",
      "issues": []
    },
    "performance": {
      "totalTrips": 125,
      "totalPassengersFerried": 3750,
      "averageDailyIncome": 5000,
      "totalIncome": 150000,
      "mileage": 15000,
      "averageSpeed": 45
    },
    "currentLocation": {
      "latitude": -1.2921,
      "longitude": 36.8219,
      "updatedAt": "2024-03-15T10:30:00.000Z"
    },
    "maintenanceInfo": {
      "lastMaintenance": "2024-02-15T00:00:00.000Z",
      "nextMaintenance": "2024-05-15T00:00:00.000Z",
      "fuelType": "Diesel"
    }
  }
}
```

### Driver Compliance

#### Get All Drivers Compliance
```http
GET /ntsa/drivers/all-compliance?schoolId=64a1b2c3d4e5f6789012345
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "count": 120,
  "data": [
    {
      "driverId": "64a1b2c3d4e5f678901234a",
      "driverIdNumber": "DRV2024001",
      "firstName": "Michael",
      "lastName": "Johnson",
      "fullName": "Michael Johnson",
      "driverType": "School Driver",
      "school": {
        "id": "64a1b2c3d4e5f6789012345",
        "name": "Nairobi Primary School",
        "code": "NPS001"
      },
      "license": {
        "number": "DL123456",
        "expiryDate": "2025-12-31",
        "status": "Valid"
      },
      "complianceScore": 95,
      "complianceStatus": "Compliant"
    }
  ]
}
```

#### Get Driver by National ID
```http
GET /ntsa/drivers/national-id/123456789
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "driver": {
      "driverName": "Michael Johnson",
      "nationalId": "123456789",
      "status": "active",
      "contactDetails": {
        "phone": "+254-712-345-682",
        "email": "driver@example.com"
      },
      "bloodType": "O+"
    },
    "complianceStatus": {
      "score": 95,
      "status": "Compliant",
      "issues": []
    },
    "expiringDocuments": [],
    "documentation": {
      "driverLicense": {
        "number": "DL123456",
        "expiryDate": "2025-12-31"
      },
      "psvLicense": {
        "number": "PSV789012",
        "expiryDate": "2025-06-30"
      },
      "medicalCertificate": {
        "expiryDate": "2024-12-31"
      }
    },
    "emergencyContacts": [
      {
        "name": "Jane Johnson",
        "relationship": "wife",
        "phone": "+254-712-345-683",
        "isPrimary": true
      }
    ]
  }
}
```

### Compliance Alerts

#### Get Compliance Alerts
```http
GET /ntsa/compliance-alerts?severity=high&page=1&limit=50
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "count": 8,
  "total": 15,
  "pages": 2,
  "currentPage": 1,
  "data": [
    {
      "id": "alert_001",
      "type": "insurance",
      "severity": "high",
      "message": "Insurance expiring in 7 days for vehicle KAB123X",
      "createdAt": "2024-03-15T10:30:00.000Z",
      "entity": {
        "type": "vehicle",
        "id": "64a1b2c3d4e5f6789012349",
        "identifier": "KAB123X"
      },
      "actionRequired": true,
      "dueDate": "2024-03-22T00:00:00.000Z"
    }
  ]
}
```

### Fleet Analytics

#### Get Fleet Analytics
```http
GET /ntsa/fleet-analytics?schoolId=64a1b2c3d4e5f6789012345&startDate=2024-01-01&endDate=2024-03-31
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalVehicles": 150,
      "activeVehicles": 145,
      "totalDrivers": 120,
      "activeDrivers": 115,
      "totalRoutes": 75,
      "activeRoutes": 70
    },
    "trends": {
      "vehicleCompliance": [
        { "date": "2024-01", "rate": 88 },
        { "date": "2024-02", "rate": 90 },
        { "date": "2024-03", "rate": 92 }
      ],
      "driverCompliance": [
        { "date": "2024-01", "rate": 90 },
        { "date": "2024-02", "rate": 91 },
        { "date": "2024-03", "rate": 93 }
      ]
    },
    "performance": {
      "totalTrips": 1250,
      "completedTrips": 1200,
      "averageTripDuration": 45,
      "onTimePerformance": 96
    },
    "risk": {
      "totalIncidents": 3,
      "highRiskIncidents": 1,
      "riskScore": 85,
      "riskFactors": [
        { "factor": "Vehicle Age", "impact": "Medium" },
        { "factor": "Driver Experience", "impact": "Low" }
      ]
    }
  }
}
```

---

## 👨‍👩‍👧‍👦 Parent Portal APIs

### Parent Dashboard

#### Get Parent Dashboard
```http
GET /parents/dashboard
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "children": [
      {
        "id": "64a1b2c3d4e5f6789012346",
        "firstName": "Jane",
        "lastName": "Smith",
        "studentId": "STU2024001",
        "admissionNumber": "ADM2024001",
        "grade": "Grade 3",
        "photo": "https://example.com/photos/jane.jpg"
      }
    ],
    "upcomingTrips": [
      {
        "id": "64a1b2c3d4e5f678901234d",
        "date": "2024-03-15",
        "type": "afternoon",
        "route": "Nairobi CBD to Westlands",
        "vehicle": "KAB123X",
        "driver": "Michael Johnson",
        "estimatedArrival": "16:15",
        "status": "scheduled"
      }
    ],
    "recentNotifications": [
      {
        "id": "64a1b2c3d4e5f678901234e",
        "type": "trip_update",
        "title": "Bus Departed School",
        "message": "Jane's bus has departed school and is on the way",
        "timestamp": "2024-03-15T15:30:00.000Z",
        "read": false
      }
    ],
    "alerts": []
  }
}
```

### Student Tracking

#### Get Student Current Location
```http
GET /parents/students/64a1b2c3d4e5f6789012346/location
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "studentId": "64a1b2c3d4e5f6789012346",
    "currentTrip": {
      "id": "64a1b2c3d4e5f678901234d",
      "status": "in_progress",
      "startedAt": "2024-03-15T15:30:00.000Z",
      "estimatedArrival": "2024-03-15T16:15:00.000Z"
    },
    "vehicle": {
      "registrationNumber": "KAB123X",
      "currentLocation": {
        "latitude": -1.2921,
        "longitude": 36.8219,
        "lastUpdated": "2024-03-15T15:45:00.000Z"
      },
      "speed": 35,
      "heading": 270
    },
    "route": {
      "name": "Nairobi CBD to Westlands",
      "currentStop": {
        "name": "Kenyatta Avenue",
        "sequence": 3,
        "estimatedArrival": "2024-03-15T15:50:00.000Z"
      },
      "nextStop": {
        "name": "Westlands Mall",
        "sequence": 4,
        "estimatedArrival": "2024-03-15T16:15:00.000Z"
      }
    },
    "attendance": {
      "pickedUp": true,
      "pickupTime": "2024-03-15T07:15:00.000Z",
      "droppedOff": false
    }
  }
}
```

#### Get Student Trip History
```http
GET /parents/students/64a1b2c3d4e5f6789012346/trips?startDate=2024-03-01&endDate=2024-03-31
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "count": 22,
  "data": [
    {
      "id": "64a1b2c3d4e5f678901234d",
      "date": "2024-03-15",
      "type": "morning",
      "route": "Nairobi CBD to Westlands",
      "vehicle": "KAB123X",
      "driver": "Michael Johnson",
      "status": "completed",
      "startTime": "2024-03-15T07:00:00.000Z",
      "endTime": "2024-03-15T07:45:00.000Z",
      "attendance": {
        "pickedUp": true,
        "pickupTime": "2024-03-15T07:15:00.000Z",
        "droppedOff": true,
        "dropOffTime": "2024-03-15T07:40:00.000Z"
      },
      "events": [
        {
          "type": "pickup",
          "timestamp": "2024-03-15T07:15:00.000Z",
          "location": "Westlands Mall"
        },
        {
          "type": "dropoff",
          "timestamp": "2024-03-15T07:40:00.000Z",
          "location": "Nairobi CBD"
        }
      ]
    }
  ]
}
```

### Notifications

#### Get Parent Notifications
```http
GET /parents/notifications?page=1&limit=20&status=unread
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "count": 5,
  "total": 15,
  "pages": 1,
  "currentPage": 1,
  "data": [
    {
      "id": "64a1b2c3d4e5f678901234e",
      "type": "trip_update",
      "title": "Bus Departed School",
      "message": "Jane's bus has departed school and is on the way",
      "studentId": "64a1b2c3d4e5f6789012346",
      "studentName": "Jane Smith",
      "timestamp": "2024-03-15T15:30:00.000Z",
      "read": false,
      "priority": "normal",
      "metadata": {
        "tripId": "64a1b2c3d4e5f678901234d",
        "vehicle": "KAB123X",
        "driver": "Michael Johnson"
      }
    }
  ]
}
```

#### Mark Notification as Read
```http
PUT /parents/notifications/64a1b2c3d4e5f678901234e/read
Authorization: Bearer <token>
```

#### Get Notification Settings
```http
GET /parents/settings/notifications
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "email": {
      "tripUpdates": true,
      "emergencyAlerts": true,
      "scheduleChanges": true,
      "generalAnnouncements": false
    },
    "sms": {
      "tripUpdates": true,
      "emergencyAlerts": true,
      "scheduleChanges": false,
      "generalAnnouncements": false
    },
    "push": {
      "tripUpdates": true,
      "emergencyAlerts": true,
      "scheduleChanges": true,
      "generalAnnouncements": true
    }
  }
}
```

#### Update Notification Settings
```http
PUT /parents/settings/notifications
Authorization: Bearer <token>
Content-Type: application/json

{
  "email": {
    "tripUpdates": true,
    "emergencyAlerts": true,
    "scheduleChanges": true,
    "generalAnnouncements": false
  },
  "sms": {
    "tripUpdates": true,
    "emergencyAlerts": true,
    "scheduleChanges": false,
    "generalAnnouncements": false
  },
  "push": {
    "tripUpdates": true,
    "emergencyAlerts": true,
    "scheduleChanges": true,
    "generalAnnouncements": true
  }
}
```

### Communication

#### Send Message to School
```http
POST /parents/messages
Authorization: Bearer <token>
Content-Type: application/json

{
  "schoolId": "64a1b2c3d4e5f6789012345",
  "subject": "Request for Schedule Change",
  "message": "I would like to request a temporary change in pickup location for next week due to construction in our area.",
  "priority": "normal"
}
```

#### Get Message History
```http
GET /parents/messages?page=1&limit=20
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "count": 10,
  "data": [
    {
      "id": "64a1b2c3d4e5f678901234f",
      "subject": "Request for Schedule Change",
      "message": "I would like to request a temporary change...",
      "status": "pending",
      "sentAt": "2024-03-15T10:30:00.000Z",
      "response": null,
      "schoolId": "64a1b2c3d4e5f6789012345"
    }
  ]
}
```

---

## 📋 Common Data Structures

### User Object
```json
{
  "id": "string",
  "name": "string",
  "email": "string",
  "role": "admin|parent|driver|staff|ntsa_officer",
  "profile": {
    "firstName": "string",
    "lastName": "string",
    "phone": "string",
    "photo": "string"
  },
  "createdAt": "datetime",
  "lastLogin": "datetime"
}
```

### Location Object
```json
{
  "coordinates": {
    "latitude": "number",
    "longitude": "number"
  },
  "address": "string",
  "lastUpdated": "datetime"
}
```

### Pagination Response
```json
{
  "success": true,
  "count": "number",
  "total": "number",
  "page": "number",
  "pages": "number",
  "data": "array"
}
```

### Error Response
```json
{
  "success": false,
  "error": "string",
  "code": "ERROR_CODE",
  "details": "object"
}
```

---

## ⚠️ Error Handling

### Common HTTP Status Codes
- **200**: Success
- **201**: Created
- **400**: Bad Request
- **401**: Unauthorized
- **403**: Forbidden
- **404**: Not Found
- **409**: Conflict
- **422**: Validation Error
- **429**: Too Many Requests
- **500**: Internal Server Error

### Error Response Format
```json
{
  "success": false,
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": {
    "field": "email",
    "message": "Email is required"
  }
}
```

### Frontend Error Handling Example
```javascript
try {
  const response = await fetch('/api/v1/parents/dashboard', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }
  
  return data;
} catch (error) {
  console.error('API Error:', error);
  
  // Handle specific error cases
  if (error.message.includes('Unauthorized')) {
    // Redirect to login
    window.location.href = '/login';
  } else if (error.message.includes('Validation')) {
    // Show validation errors to user
    setValidationErrors(error.details);
  } else {
    // Show generic error message
    setErrorMessage('Something went wrong. Please try again.');
  }
}
```

---

## 🚦 Rate Limiting & Best Practices

### Rate Limits
- **Standard Users**: 100 requests per 10 minutes
- **Development**: 1000 requests per 10 minutes
- **NTSA Officers**: 500 requests per 10 minutes

### Best Practices

#### 1. Token Management
```javascript
// Store token securely
localStorage.setItem('token', token);

// Auto-refresh token before expiry
const checkTokenExpiry = () => {
  const token = localStorage.getItem('token');
  if (token) {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const expiryTime = payload.exp * 1000;
    
    if (Date.now() >= expiryTime - 60000) { // 1 minute before expiry
      refreshToken();
    }
  }
};
```

#### 2. Request Caching
```javascript
// Implement caching for frequently accessed data
const cache = new Map();

const cachedFetch = async (url, options = {}) => {
  const cacheKey = `${url}_${JSON.stringify(options)}`;
  
  if (cache.has(cacheKey)) {
    const cachedData = cache.get(cacheKey);
    if (Date.now() - cachedData.timestamp < 60000) { // 1 minute cache
      return cachedData.data;
    }
  }
  
  const response = await fetch(url, options);
  const data = await response.json();
  
  cache.set(cacheKey, {
    data,
    timestamp: Date.now()
  });
  
  return data;
};
```

#### 3. Real-time Updates
```javascript
// WebSocket connection for real-time updates
const ws = new WebSocket('ws://localhost:5000');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  switch (data.type) {
    case 'location_update':
      updateVehicleLocation(data.payload);
      break;
    case 'trip_update':
      updateTripStatus(data.payload);
      break;
    case 'notification':
      addNotification(data.payload);
      break;
  }
};
```

#### 4. Error Boundaries
```javascript
// React Error Boundary Example
class ApiErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('API Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <div>Something went wrong. Please refresh the page.</div>;
    }

    return this.props.children;
  }
}
```

#### 5. Loading States
```javascript
// Implement loading states for better UX
const [loading, setLoading] = useState(false);
const [data, setData] = useState(null);

const fetchData = async () => {
  setLoading(true);
  try {
    const response = await api.get('/dashboard');
    setData(response.data);
  } catch (error) {
    console.error(error);
  } finally {
    setLoading(false);
  }
};
```

---

## 🛠 Development Setup

### Environment Variables
```bash
# API Configuration
REACT_APP_API_URL=http://localhost:5000/api/v1
REACT_APP_WS_URL=ws://localhost:5000

# Feature Flags
REACT_APP_ENABLE_REAL_TIME=true
REACT_APP_ENABLE_NOTIFICATIONS=true
```

### API Client Setup
```javascript
// api.js
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

---

## 📱 Mobile Considerations

### Responsive Design
- Use responsive breakpoints for mobile/tablet/desktop
- Implement touch-friendly UI components
- Optimize for offline functionality

### Push Notifications
```javascript
// Service Worker Registration
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
    .then(registration => {
      console.log('SW registered:', registration);
    })
    .catch(error => {
      console.log('SW registration failed:', error);
    });
}
```

### Offline Support
```javascript
// Cache API responses for offline access
const cacheResponses = async (url, data) => {
  const cache = await caches.open('api-cache');
  await cache.put(url, new Response(JSON.stringify(data)));
};
```

---

## 🎯 Quick Start Examples

### React Component Example
```jsx
import React, { useState, useEffect } from 'react';
import api from './api';

const ParentDashboard = () => {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await api.get('/parents/dashboard');
        setDashboard(response.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h1>Parent Dashboard</h1>
      <div>
        <h2>Children ({dashboard.children.length})</h2>
        {dashboard.children.map(child => (
          <div key={child.id}>
            <h3>{child.firstName} {child.lastName}</h3>
            <p>Grade: {child.grade}</p>
            <p>Student ID: {child.studentId}</p>
          </div>
        ))}
      </div>
      
      <div>
        <h2>Upcoming Trips</h2>
        {dashboard.upcomingTrips.map(trip => (
          <div key={trip.id}>
            <p>{trip.type} - {trip.route}</p>
            <p>Vehicle: {trip.vehicle}</p>
            <p>Driver: {trip.driver}</p>
            <p>ETA: {trip.estimatedArrival}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ParentDashboard;
```

### Vue Component Example
```vue
<template>
  <div class="parent-dashboard">
    <h1>Parent Dashboard</h1>
    
    <div v-if="loading" class="loading">Loading...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else>
      <section class="children">
        <h2>Children ({{ dashboard.children.length }})</h2>
        <div v-for="child in dashboard.children" :key="child.id" class="child-card">
          <h3>{{ child.firstName }} {{ child.lastName }}</h3>
          <p>Grade: {{ child.grade }}</p>
          <p>Student ID: {{ child.studentId }}</p>
        </div>
      </section>
      
      <section class="trips">
        <h2>Upcoming Trips</h2>
        <div v-for="trip in dashboard.upcomingTrips" :key="trip.id" class="trip-card">
          <p>{{ trip.type }} - {{ trip.route }}</p>
          <p>Vehicle: {{ trip.vehicle }}</p>
          <p>Driver: {{ trip.driver }}</p>
          <p>ETA: {{ trip.estimatedArrival }}</p>
        </div>
      </section>
    </div>
  </div>
</template>

<script>
import api from '@/api';

export default {
  name: 'ParentDashboard',
  data() {
    return {
      dashboard: null,
      loading: true,
      error: null
    };
  },
  async created() {
    try {
      const response = await api.get('/parents/dashboard');
      this.dashboard = response.data;
    } catch (err) {
      this.error = err.message;
    } finally {
      this.loading = false;
    }
  }
};
</script>
```

---

## 📞 Support & Troubleshooting

### Common Issues
1. **CORS Errors**: Ensure API URL is correctly configured
2. **Authentication Failures**: Check token storage and refresh logic
3. **Rate Limiting**: Implement request debouncing and caching
4. **Real-time Updates**: Verify WebSocket connection status

### Debug Tools
- Browser Developer Tools (Network Tab)
- API Response Headers Inspection
- Console Error Logging
- Network Throttling for Mobile Testing

### Contact Support
- **Technical Issues**: technical-support@example.com
- **API Documentation**: docs@example.com
- **Feature Requests**: features@example.com

---

## 🎉 Conclusion

This comprehensive API documentation provides all the necessary information for frontend developers to successfully integrate with the School Management System, NTSA Regulatory Compliance Dashboard, and Parent Portal features.

The APIs are designed with:
- **RESTful Architecture** for consistency
- **Comprehensive Error Handling** for robust applications
- **Real-time Capabilities** for live tracking
- **Security Best Practices** for data protection
- **Mobile-First Design** for cross-platform compatibility

For any additional questions or support, please refer to the contact information above or consult the technical support team.

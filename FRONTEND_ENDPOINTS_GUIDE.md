# Frontend API Integration Guide

## Table of Contents
1. [Authentication Setup](#authentication-setup)
2. [School Management Endpoints](#school-management-endpoints)
3. [Parent Management Endpoints](#parent-management-endpoints)
4. [NTSA Policy Enforcement Endpoints](#ntsa-policy-enforcement-endpoints)
5. [Error Handling](#error-handling)
6. [Response Format Standards](#response-format-standards)
7. [React Integration Examples](#react-integration-examples)
8. [Vue Integration Examples](#vue-integration-examples)
9. [Testing Endpoints](#testing-endpoints)

---

## Authentication Setup

All API endpoints require authentication. Include the JWT token in your requests:

### Axios Setup
```javascript
// api/axios.js
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token refresh
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

### Fetch API Setup
```javascript
// utils/api.js
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1';

class ApiClient {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  async request(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    const url = `${this.baseURL}${endpoint}`;
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` })
      },
      ...options
    };

    const response = await fetch(url, config);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'API request failed');
    }
    
    return response.json();
  }

  get(endpoint) {
    return this.request(endpoint);
  }

  post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
}

export default new ApiClient();
```

---

## School Management Endpoints

### Base URL: `/api/v1/schools`

### 1. Get All Schools
```javascript
// GET /api/v1/schools
// Query Parameters: page, limit, select, sort, name, code, type

// Example Usage
const getSchools = async (params = {}) => {
  try {
    const response = await api.get('/schools', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching schools:', error);
    throw error;
  }
};

// Response Format
{
  "success": true,
  "count": 25,
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "pages": 3
  },
  "data": [
    {
      "_id": "64a7b8c9d1e2f3g4h5i6j7k8",
      "name": "Nairobi Primary School",
      "code": "NPS001",
      "type": "primary",
      "ownership": "private",
      "address": {
        "street": "123 Nairobi Road",
        "city": "Nairobi",
        "state": "Nairobi County",
        "postalCode": "00100",
        "country": "Kenya",
        "coordinates": {
          "type": "Point",
          "coordinates": [-1.2921, 36.8219]
        }
      },
      "contacts": [
        {
          "name": "Main Office",
          "email": "info@nairobi-primary.edu",
          "phone": "+254-712-345-678",
          "designation": "Administration"
        }
      ],
      "principal": {
        "name": "Dr. James Kamau",
        "email": "principal@nairobi-primary.edu",
        "phone": "+254-712-345-679"
      },
      "status": "active",
      "createdAt": "2024-01-15T08:30:00.000Z",
      "studentsCount": 125,
      "vehiclesCount": 15,
      "driversCount": 20
    }
  ]
}
```

### 2. Get Single School
```javascript
// GET /api/v1/schools/:id

const getSchool = async (schoolId) => {
  try {
    const response = await api.get(`/schools/${schoolId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching school:', error);
    throw error;
  }
};

// Response Format
{
  "success": true,
  "data": {
    "_id": "64a7b8c9d1e2f3g4h5i6j7k8",
    "name": "Nairobi Primary School",
    "code": "NPS001",
    // ... same structure as above
  }
}
```

### 3. Create School
```javascript
// POST /api/v1/schools
// Required: name, code, address, contactEmail, contactPhone

const createSchool = async (schoolData) => {
  try {
    const response = await api.post('/schools', schoolData);
    return response.data;
  } catch (error) {
    console.error('Error creating school:', error);
    throw error;
  }
};

// Request Body
{
  "name": "New Primary School",
  "code": "NPS002",
  "type": "primary",
  "ownership": "private",
  "address": {
    "street": "456 Mombasa Road",
    "city": "Nairobi",
    "state": "Nairobi County",
    "postalCode": "00100",
    "country": "Kenya",
    "coordinates": {
      "type": "Point",
      "coordinates": [-1.2921, 36.8219]
    }
  },
  "contacts": [
    {
      "name": "Main Office",
      "email": "info@new-school.edu",
      "phone": "+254-712-345-680",
      "designation": "Administration"
    }
  ],
  "principal": {
    "name": "Dr. Jane Smith",
    "email": "principal@new-school.edu",
    "phone": "+254-712-345-681"
  }
}

// Response Format
{
  "success": true,
  "data": {
    // ... created school object
  }
}
```

### 4. Update School
```javascript
// PUT /api/v1/schools/:id

const updateSchool = async (schoolId, updateData) => {
  try {
    const response = await api.put(`/schools/${schoolId}`, updateData);
    return response.data;
  } catch (error) {
    console.error('Error updating school:', error);
    throw error;
  }
};
```

### 5. Delete School
```javascript
// DELETE /api/v1/schools/:id

const deleteSchool = async (schoolId) => {
  try {
    const response = await api.delete(`/schools/${schoolId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting school:', error);
    throw error;
  }
};
```

### 6. Get School Statistics
```javascript
// GET /api/v1/schools/:id/stats

const getSchoolStats = async (schoolId) => {
  try {
    const response = await api.get(`/schools/${schoolId}/stats`);
    return response.data;
  } catch (error) {
    console.error('Error fetching school stats:', error);
    throw error;
  }
};

// Response Format
{
  "success": true,
  "data": {
    "totalStudents": 125,
    "totalVehicles": 15,
    "totalDrivers": 20,
    "totalRoutes": 20,
    "activeTrips": 8,
    "averageAttendance": 92.5,
    "fleetUtilization": 78.3,
    "safetyScore": 95.2,
    "complianceScore": 88.7
  }
}
```

### 7. Upload School Logo
```javascript
// PUT /api/v1/schools/:id/logo
// Content-Type: multipart/form-data

const uploadSchoolLogo = async (schoolId, logoFile) => {
  try {
    const formData = new FormData();
    formData.append('logo', logoFile);
    
    const response = await api.put(`/schools/${schoolId}/logo`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error uploading logo:', error);
    throw error;
  }
};
```

### 8. Toggle School Status
```javascript
// PUT /api/v1/schools/:id/status

const toggleSchoolStatus = async (schoolId) => {
  try {
    const response = await api.put(`/schools/${schoolId}/status`);
    return response.data;
  } catch (error) {
    console.error('Error toggling school status:', error);
    throw error;
  }
};
```

---

## Parent Management Endpoints

### Base URL: `/api/v1/schools/:schoolId/parents`

### 1. Get All Parents for a School
```javascript
// GET /api/v1/schools/:schoolId/parents

const getParents = async (schoolId) => {
  try {
    const response = await api.get(`/schools/${schoolId}/parents`);
    return response.data;
  } catch (error) {
    console.error('Error fetching parents:', error);
    throw error;
  }
};

// Response Format
{
  "success": true,
  "count": 250,
  "data": [
    {
      "_id": "64a7b8c9d1e2f3g4h5i6j7k9",
      "school": "64a7b8c9d1e2f3g4h5i6j7k8",
      "firstName": "James",
      "lastName": "Chebet",
      "email": "james.chebet1000@parent.com",
      "phone": "+254-712-345-678",
      "address": "123 Parent Street",
      "city": "Nairobi",
      "state": "Nairobi County",
      "postalCode": "00100",
      "country": "Kenya",
      "children": [
        {
          "student": {
            "_id": "64a7b8c9d1e2f3g4h5i6j7ka",
            "studentId": "NPS001STU001",
            "firstName": "John",
            "lastName": "Chebet",
            "grade": "Grade 3"
          },
          "relationship": "father"
        }
      ],
      "notificationPreferences": {
        "sms": true,
        "email": true,
        "push": true
      },
      "createdAt": "2024-01-15T08:30:00.000Z"
    }
  ]
}
```

### 2. Get Single Parent
```javascript
// GET /api/v1/parents/:id

const getParent = async (parentId) => {
  try {
    const response = await api.get(`/parents/${parentId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching parent:', error);
    throw error;
  }
};
```

### 3. Create Parent
```javascript
// POST /api/v1/schools/:schoolId/parents

const createParent = async (schoolId, parentData) => {
  try {
    const response = await api.post(`/schools/${schoolId}/parents`, parentData);
    return response.data;
  } catch (error) {
    console.error('Error creating parent:', error);
    throw error;
  }
};

// Request Body
{
  "firstName": "Mary",
  "lastName": "Wanjiru",
  "email": "mary.wanjiru1001@parent.com",
  "phone": "+254-712-345-679",
  "address": "456 Parent Street",
  "city": "Nairobi",
  "state": "Nairobi County",
  "postalCode": "00100",
  "country": "Kenya",
  "children": [
    {
      "student": "64a7b8c9d1e2f3g4h5i6j7kb",
      "relationship": "mother"
    }
  ],
  "notificationPreferences": {
    "sms": true,
    "email": true,
    "push": false
  }
}
```

### 4. Update Parent
```javascript
// PUT /api/v1/parents/:id

const updateParent = async (parentId, updateData) => {
  try {
    const response = await api.put(`/parents/${parentId}`, updateData);
    return response.data;
  } catch (error) {
    console.error('Error updating parent:', error);
    throw error;
  }
};
```

### 5. Delete Parent
```javascript
// DELETE /api/v1/parents/:id

const deleteParent = async (parentId) => {
  try {
    const response = await api.delete(`/parents/${parentId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting parent:', error);
    throw error;
  }
};
```

---

## NTSA Policy Enforcement Endpoints

### Base URL: `/api/v1/ntsa`

### 1. Vehicle Compliance Status
```javascript
// GET /api/v1/ntsa/vehicles/compliance-status
// Query Parameters: schoolId, status, page, limit

const getVehicleCompliance = async (params = {}) => {
  try {
    const response = await api.get('/ntsa/vehicles/compliance-status', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching vehicle compliance:', error);
    throw error;
  }
};

// Response Format
{
  "success": true,
  "count": 15,
  "data": [
    {
      "_id": "64a7b8c9d1e2f3g4h5i6j7kc",
      "registrationNumber": "KAB100A",
      "make": "Toyota",
      "model": "Hiace",
      "year": 2022,
      "capacity": 25,
      "school": {
        "_id": "64a7b8c9d1e2f3g4h5i6j7k8",
        "name": "Nairobi Primary School",
        "code": "NPS001"
      },
      "compliance": {
        "score": 85,
        "status": "compliant",
        "issues": [
          "Insurance expires in 15 days"
        ],
        "insurance": {
          "status": "valid",
          "expiryDate": "2024-02-15T00:00:00.000Z",
          "daysUntilExpiry": 15
        },
        "registration": {
          "status": "valid",
          "expiryDate": "2024-12-31T00:00:00.000Z"
        },
        "inspection": {
          "status": "valid",
          "lastInspection": "2024-01-01T00:00:00.000Z",
          "nextInspection": "2024-04-01T00:00:00.000Z"
        },
        "safetyFeatures": {
          "seatBelts": true,
          "fireExtinguisher": true,
          "firstAidKit": true,
          "emergencyExit": true
        }
      },
      "currentAssignment": {
        "driver": {
          "_id": "64a7b8c9d1e2f3g4h5i6j7kd",
          "firstName": "John",
          "lastName": "Kamau",
          "driverId": "DRV001"
        },
        "route": {
          "_id": "64a7b8c9d1e2f3g4h5i6j7ke",
          "name": "Nairobi CBD Route",
          "routeId": "NPS001RTE01"
        }
      }
    }
  ]
}
```

### 2. Driver Compliance Status
```javascript
// GET /api/v1/ntsa/drivers/license-status
// Query Parameters: schoolId, status, page, limit

const getDriverCompliance = async (params = {}) => {
  try {
    const response = await api.get('/ntsa/drivers/license-status', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching driver compliance:', error);
    throw error;
  }
};

// Response Format
{
  "success": true,
  "count": 20,
  "data": [
    {
      "_id": "64a7b8c9d1e2f3g4h5i6j7kd",
      "firstName": "John",
      "lastName": "Kamau",
      "driverId": "DRV001",
      "nationalId": "12345678",
      "phone": "+254-712-345-678",
      "school": {
        "_id": "64a7b8c9d1e2f3g4h5i6j7k8",
        "name": "Nairobi Primary School",
        "code": "NPS001"
      },
      "compliance": {
        "score": 92,
        "status": "compliant",
        "issues": [],
        "license": {
          "number": "DL123456",
          "type": "B",
          "status": "valid",
          "expiryDate": "2025-12-31T00:00:00.000Z",
          "daysUntilExpiry": 380
        },
        "psvLicense": {
          "number": "PSV789012",
          "status": "valid",
          "expiryDate": "2024-06-30T00:00:00.000Z",
          "daysUntilExpiry": 180
        },
        "medicalClearance": {
          "status": "valid",
          "expiryDate": "2024-12-31T00:00:00.000Z",
          "daysUntilExpiry": 380
        },
        "trainingCertificates": [
          {
            "name": "Defensive Driving",
            "type": "defensive_driving",
            "status": "valid",
            "expiryDate": "2024-12-31T00:00:00.000Z"
          }
        ]
      },
      "performance": {
        "averageRating": 4.5,
        "totalTrips": 1250,
        "onTimePercentage": 94.2,
        "safetyRecord": "excellent",
        "complaints": 0
      }
    }
  ]
}
```

### 3. Route Safety Analysis
```javascript
// GET /api/v1/ntsa/routes/safety-analysis
// Query Parameters: schoolId, routeId, page, limit

const getRouteSafetyAnalysis = async (params = {}) => {
  try {
    const response = await api.get('/ntsa/routes/safety-analysis', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching route safety analysis:', error);
    throw error;
  }
};

// Response Format
{
  "success": true,
  "count": 20,
  "data": [
    {
      "_id": "64a7b8c9d1e2f3g4h5i6j7ke",
      "routeId": "NPS001RTE01",
      "name": "Nairobi CBD Route",
      "school": {
        "_id": "64a7b8c9d1e2f3g4h5i6j7k8",
        "name": "Nairobi Primary School",
        "code": "NPS001"
      },
      "safety": {
        "score": 88,
        "status": "safe",
        "riskLevel": "low",
        "incidents": [
          {
            "type": "minor",
            "date": "2024-01-10T08:30:00.000Z",
            "description": "Traffic violation"
          }
        ],
        "hotspots": [
          {
            "location": "Nairobi CBD Intersection",
            "risk": "medium",
            "incidents": 2,
            "recommendations": [
              "Add traffic marshal",
              "Adjust pickup timing"
            ]
          }
        ],
        "metrics": {
          "averageSpeed": 45.2,
          "speedViolations": 2,
          "harshBraking": 5,
          "routeDeviations": 0,
          "overcrowdingIncidents": 1
        }
      },
      "compliance": {
        "scheduleAdherence": 94.5,
        "capacityUtilization": 78.3,
        "driverPerformance": 92.1,
        "vehicleCondition": 85.7
      }
    }
  ]
}
```

### 4. Fleet Overview
```javascript
// GET /api/v1/ntsa/fleet/overview
// Query Parameters: schoolId

const getFleetOverview = async (schoolId) => {
  try {
    const params = schoolId ? { schoolId } : {};
    const response = await api.get('/ntsa/fleet/overview', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching fleet overview:', error);
    throw error;
  }
};

// Response Format
{
  "success": true,
  "data": {
    "summary": {
      "totalVehicles": 15,
      "totalDrivers": 20,
      "totalRoutes": 20,
      "activeTrips": 8,
      "overallComplianceScore": 87.5,
      "fleetUtilization": 78.3
    },
    "complianceBreakdown": {
      "vehicles": {
        "compliant": 12,
        "nonCompliant": 2,
        "expiringSoon": 1
      },
      "drivers": {
        "compliant": 18,
        "nonCompliant": 1,
        "expiringSoon": 1
      },
      "routes": {
        "safe": 18,
        "moderateRisk": 2,
        "highRisk": 0
      }
    },
    "alerts": [
      {
        "type": "insurance_expiry",
        "severity": "high",
        "count": 2,
        "description": "2 vehicles have insurance expiring soon"
      },
      {
        "type": "license_expiry",
        "severity": "medium",
        "count": 1,
        "description": "1 driver license expiring soon"
      }
    ],
    "trends": {
      "complianceTrend": [
        { "date": "2024-01-01", "score": 85.2 },
        { "date": "2024-01-08", "score": 86.8 },
        { "date": "2024-01-15", "score": 87.5 }
      ],
      "incidentTrend": [
        { "date": "2024-01-01", "count": 0 },
        { "date": "2024-01-08", "count": 1 },
        { "date": "2024-01-15", "count": 0 }
      ]
    }
  }
}
```

### 5. Course Compliance Monitoring
```javascript
// GET /api/v1/ntsa/courses/compliance
// Query Parameters: schoolId, status, page, limit

const getCourseCompliance = async (params = {}) => {
  try {
    const response = await api.get('/ntsa/courses/compliance', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching course compliance:', error);
    throw error;
  }
};

// Response Format
{
  "success": true,
  "count": 15,
  "data": [
    {
      "_id": "64a7b8c9d1e2f3g4h5i6j7kf",
      "routeNumber": "R1000",
      "routeName": "Nairobi Primary - Westlands",
      "school": {
        "_id": "64a7b8c9d1e2f3g4h5i6j7k8",
        "name": "Nairobi Primary School",
        "code": "NPS001"
      },
      "compliance": {
        "score": 88,
        "status": "compliant",
        "issues": [
          "Occasional overcrowding during peak hours"
        ]
      },
      "capacity": {
        "maxCapacity": 60,
        "currentPassengers": 45,
        "utilizationRate": 75,
        "overcrowdingIncidents": 1
      },
      "vehicleLocations": [
        {
          "plateNumber": "KAB100A",
          "currentLocation": {
            "latitude": -1.2921,
            "longitude": 36.8219,
            "timestamp": "2024-01-15T08:30:00.000Z"
          },
          "status": "active"
        }
      ],
      "schedule": {
        "startTime": "07:00",
        "endTime": "16:30",
        "frequency": 30,
        "onTimePerformance": 94.2
      }
    }
  ]
}
```

---

## Error Handling

### Standard Error Response Format
```javascript
{
  "success": false,
  "error": "Error message description",
  "code": "ERROR_CODE",
  "details": {
    // Additional error details (optional)
  }
}
```

### Common HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (invalid/expired token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

### Error Handling Implementation
```javascript
// utils/errorHandler.js
export const handleApiError = (error) => {
  if (error.response) {
    // Server responded with error status
    const { status, data } = error.response;
    
    switch (status) {
      case 401:
        // Redirect to login
        localStorage.removeItem('token');
        window.location.href = '/login';
        break;
      case 403:
        // Show permission error
        throw new Error('You do not have permission to perform this action');
      case 404:
        throw new Error('Resource not found');
      case 422:
        // Validation errors
        throw new Error(data.error || 'Validation failed');
      default:
        throw new Error(data.error || 'An error occurred');
    }
  } else if (error.request) {
    // Network error
    throw new Error('Network error. Please check your connection.');
  } else {
    // Other error
    throw new Error(error.message || 'An unexpected error occurred');
  }
};

// Usage in components
try {
  const schools = await getSchools();
  setSchools(schools.data);
} catch (error) {
  handleApiError(error);
  setError(error.message);
}
```

---

## Response Format Standards

### Success Response
```javascript
{
  "success": true,
  "data": {
    // Response data
  },
  // Optional fields for list endpoints
  "count": 25,
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "pages": 3
  }
}
```

### Error Response
```javascript
{
  "success": false,
  "error": "Human-readable error message",
  "code": "ERROR_CODE", // Optional
  "details": {
    // Additional error context
  }
}
```

---

## React Integration Examples

### School Management Component
```jsx
// components/SchoolManagement.jsx
import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { handleApiError } from '../utils/errorHandler';

const SchoolManagement = () => {
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSchool, setSelectedSchool] = useState(null);

  useEffect(() => {
    fetchSchools();
  }, []);

  const fetchSchools = async () => {
    try {
      setLoading(true);
      const response = await api.get('/schools');
      setSchools(response.data.data);
    } catch (error) {
      setError(handleApiError(error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSchool = async (schoolData) => {
    try {
      const response = await api.post('/schools', schoolData);
      setSchools([...schools, response.data.data]);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  };

  const handleUpdateSchool = async (schoolId, updateData) => {
    try {
      const response = await api.put(`/schools/${schoolId}`, updateData);
      setSchools(schools.map(school => 
        school._id === schoolId ? response.data.data : school
      ));
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  };

  const handleDeleteSchool = async (schoolId) => {
    try {
      await api.delete(`/schools/${schoolId}`);
      setSchools(schools.filter(school => school._id !== schoolId));
    } catch (error) {
      throw handleApiError(error);
    }
  };

  if (loading) return <div>Loading schools...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="school-management">
      <h2>School Management</h2>
      
      {/* School List */}
      <div className="school-list">
        {schools.map(school => (
          <div key={school._id} className="school-card">
            <h3>{school.name}</h3>
            <p>Code: {school.code}</p>
            <p>Type: {school.type}</p>
            <p>Status: {school.status}</p>
            
            <div className="school-actions">
              <button onClick={() => setSelectedSchool(school)}>
                Edit
              </button>
              <button onClick={() => handleDeleteSchool(school._id)}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* School Form */}
      {selectedSchool && (
        <SchoolForm
          school={selectedSchool}
          onSubmit={selectedSchool._id ? handleUpdateSchool : handleCreateSchool}
          onCancel={() => setSelectedSchool(null)}
        />
      )}
    </div>
  );
};

export default SchoolManagement;
```

### Parent Management Component
```jsx
// components/ParentManagement.jsx
import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { handleApiError } from '../utils/errorHandler';

const ParentManagement = ({ schoolId }) => {
  const [parents, setParents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (schoolId) {
      fetchParents();
    }
  }, [schoolId]);

  const fetchParents = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/schools/${schoolId}/parents`);
      setParents(response.data.data);
    } catch (error) {
      setError(handleApiError(error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateParent = async (parentData) => {
    try {
      const response = await api.post(`/schools/${schoolId}/parents`, parentData);
      setParents([...parents, response.data.data]);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  };

  if (loading) return <div>Loading parents...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="parent-management">
      <h2>Parent Management</h2>
      
      <div className="parent-list">
        {parents.map(parent => (
          <div key={parent._id} className="parent-card">
            <h3>{parent.firstName} {parent.lastName}</h3>
            <p>Email: {parent.email}</p>
            <p>Phone: {parent.phone}</p>
            
            <div className="children">
              <h4>Children:</h4>
              {parent.children.map(child => (
                <div key={child.student._id} className="child-info">
                  <p>{child.student.firstName} {child.student.lastName}</p>
                  <p>Grade: {child.student.grade}</p>
                  <p>Relationship: {child.relationship}</p>
                </div>
              ))}
            </div>
            
            <div className="notification-preferences">
              <h4>Notifications:</h4>
              <p>SMS: {parent.notificationPreferences.sms ? 'Enabled' : 'Disabled'}</p>
              <p>Email: {parent.notificationPreferences.email ? 'Enabled' : 'Disabled'}</p>
              <p>Push: {parent.notificationPreferences.push ? 'Enabled' : 'Disabled'}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ParentManagement;
```

### NTSA Compliance Dashboard
```jsx
// components/NTSADashboard.jsx
import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { handleApiError } from '../utils/errorHandler';

const NTSADashboard = ({ schoolId }) => {
  const [fleetOverview, setFleetOverview] = useState(null);
  const [vehicleCompliance, setVehicleCompliance] = useState([]);
  const [driverCompliance, setDriverCompliance] = useState([]);
  const [routeSafety, setRouteSafety] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchNTSAData();
  }, [schoolId]);

  const fetchNTSAData = async () => {
    try {
      setLoading(true);
      
      const [fleet, vehicles, drivers, routes] = await Promise.all([
        api.get('/ntsa/fleet/overview', { params: { schoolId } }),
        api.get('/ntsa/vehicles/compliance-status', { params: { schoolId } }),
        api.get('/ntsa/drivers/license-status', { params: { schoolId } }),
        api.get('/ntsa/routes/safety-analysis', { params: { schoolId } })
      ]);

      setFleetOverview(fleet.data.data);
      setVehicleCompliance(vehicles.data.data);
      setDriverCompliance(drivers.data.data);
      setRouteSafety(routes.data.data);
    } catch (error) {
      setError(handleApiError(error).message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading NTSA data...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="ntsa-dashboard">
      <h2>NTSA Compliance Dashboard</h2>
      
      {/* Fleet Overview */}
      {fleetOverview && (
        <div className="fleet-overview">
          <h3>Fleet Overview</h3>
          <div className="overview-stats">
            <div className="stat">
              <h4>Total Vehicles</h4>
              <p>{fleetOverview.summary.totalVehicles}</p>
            </div>
            <div className="stat">
              <h4>Total Drivers</h4>
              <p>{fleetOverview.summary.totalDrivers}</p>
            </div>
            <div className="stat">
              <h4>Compliance Score</h4>
              <p>{fleetOverview.summary.overallComplianceScore}%</p>
            </div>
            <div className="stat">
              <h4>Fleet Utilization</h4>
              <p>{fleetOverview.summary.fleetUtilization}%</p>
            </div>
          </div>
          
          {/* Alerts */}
          <div className="alerts">
            <h4>Active Alerts</h4>
            {fleetOverview.alerts.map((alert, index) => (
              <div key={index} className={`alert ${alert.type}`}>
                <p className="alert-title">{alert.description}</p>
                <p className="alert-severity">Severity: {alert.severity}</p>
                <p className="alert-count">Count: {alert.count}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Vehicle Compliance */}
      <div className="vehicle-compliance">
        <h3>Vehicle Compliance</h3>
        <div className="compliance-list">
          {vehicleCompliance.map(vehicle => (
            <div key={vehicle._id} className={`vehicle-card ${vehicle.compliance.status}`}>
              <h4>{vehicle.registrationNumber} - {vehicle.make} {vehicle.model}</h4>
              <div className="compliance-score">
                Score: {vehicle.compliance.score}%
              </div>
              <div className="compliance-details">
                <p>Insurance: {vehicle.compliance.insurance.status}</p>
                <p>Registration: {vehicle.compliance.registration.status}</p>
                <p>Inspection: {vehicle.compliance.inspection.status}</p>
              </div>
              {vehicle.compliance.issues.length > 0 && (
                <div className="issues">
                  <h5>Issues:</h5>
                  {vehicle.compliance.issues.map((issue, index) => (
                    <p key={index} className="issue">{issue}</p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Driver Compliance */}
      <div className="driver-compliance">
        <h3>Driver Compliance</h3>
        <div className="compliance-list">
          {driverCompliance.map(driver => (
            <div key={driver._id} className={`driver-card ${driver.compliance.status}`}>
              <h4>{driver.firstName} {driver.lastName} - {driver.driverId}</h4>
              <div className="compliance-score">
                Score: {driver.compliance.score}%
              </div>
              <div className="compliance-details">
                <p>License: {driver.compliance.license.status}</p>
                <p>PSV License: {driver.compliance.psvLicense.status}</p>
                <p>Medical: {driver.compliance.medicalClearance.status}</p>
              </div>
              <div className="performance">
                <h5>Performance:</h5>
                <p>Rating: {driver.performance.averageRating}/5</p>
                <p>On-time: {driver.performance.onTimePercentage}%</p>
                <p>Total Trips: {driver.performance.totalTrips}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Route Safety */}
      <div className="route-safety">
        <h3>Route Safety Analysis</h3>
        <div className="safety-list">
          {routeSafety.map(route => (
            <div key={route._id} className={`route-card ${route.safety.status}`}>
              <h4>{route.name} - {route.routeId}</h4>
              <div className="safety-score">
                Score: {route.safety.score}%
              </div>
              <div className="safety-details">
                <p>Risk Level: {route.safety.riskLevel}</p>
                <p>Average Speed: {route.safety.metrics.averageSpeed} km/h</p>
                <p>Speed Violations: {route.safety.metrics.speedViolations}</p>
              </div>
              {route.safety.hotspots.length > 0 && (
                <div className="hotspots">
                  <h5>Risk Hotspots:</h5>
                  {route.safety.hotspots.map((hotspot, index) => (
                    <div key={index} className="hotspot">
                      <p>Location: {hotspot.location}</p>
                      <p>Risk: {hotspot.risk}</p>
                      <p>Incidents: {hotspot.incidents}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NTSADashboard;
```

---

## Vue Integration Examples

### School Management Component (Vue 3)
```vue
<!-- components/SchoolManagement.vue -->
<template>
  <div class="school-management">
    <h2>School Management</h2>
    
    <div v-if="loading" class="loading">
      Loading schools...
    </div>
    
    <div v-else-if="error" class="error">
      {{ error }}
    </div>
    
    <div v-else class="school-list">
      <div 
        v-for="school in schools" 
        :key="school._id" 
        class="school-card"
      >
        <h3>{{ school.name }}</h3>
        <p>Code: {{ school.code }}</p>
        <p>Type: {{ school.type }}</p>
        <p>Status: {{ school.status }}</p>
        
        <div class="school-actions">
          <button @click="editSchool(school)">Edit</button>
          <button @click="deleteSchool(school._id)">Delete</button>
        </div>
      </div>
    </div>
    
    <SchoolForm
      v-if="selectedSchool"
      :school="selectedSchool"
      @submit="handleSubmit"
      @cancel="selectedSchool = null"
    />
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import api from '../api/axios';
import { handleApiError } from '../utils/errorHandler';
import SchoolForm from './SchoolForm.vue';

export default {
  name: 'SchoolManagement',
  components: {
    SchoolForm
  },
  setup() {
    const schools = ref([]);
    const loading = ref(true);
    const error = ref(null);
    const selectedSchool = ref(null);

    const fetchSchools = async () => {
      try {
        loading.value = true;
        const response = await api.get('/schools');
        schools.value = response.data.data;
      } catch (err) {
        error.value = handleApiError(err).message;
      } finally {
        loading.value = false;
      }
    };

    const editSchool = (school) => {
      selectedSchool.value = { ...school };
    };

    const handleSubmit = async (schoolData) => {
      try {
        if (schoolData._id) {
          // Update existing school
          const response = await api.put(`/schools/${schoolData._id}`, schoolData);
          const index = schools.value.findIndex(s => s._id === schoolData._id);
          schools.value[index] = response.data.data;
        } else {
          // Create new school
          const response = await api.post('/schools', schoolData);
          schools.value.push(response.data.data);
        }
        selectedSchool.value = null;
      } catch (err) {
        throw handleApiError(err);
      }
    };

    const deleteSchool = async (schoolId) => {
      if (confirm('Are you sure you want to delete this school?')) {
        try {
          await api.delete(`/schools/${schoolId}`);
          schools.value = schools.value.filter(s => s._id !== schoolId);
        } catch (err) {
          throw handleApiError(err);
        }
      }
    };

    onMounted(fetchSchools);

    return {
      schools,
      loading,
      error,
      selectedSchool,
      editSchool,
      handleSubmit,
      deleteSchool
    };
  }
};
</script>

<style scoped>
.school-management {
  padding: 20px;
}

.school-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.school-card {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 20px;
  background: white;
}

.school-actions {
  margin-top: 15px;
  display: flex;
  gap: 10px;
}

.loading, .error {
  text-align: center;
  padding: 20px;
}

.error {
  color: red;
}
</style>
```

### NTSA Compliance Dashboard (Vue 3)
```vue
<!-- components/NTSADashboard.vue -->
<template>
  <div class="ntsa-dashboard">
    <h2>NTSA Compliance Dashboard</h2>
    
    <div v-if="loading" class="loading">
      Loading NTSA data...
    </div>
    
    <div v-else-if="error" class="error">
      {{ error }}
    </div>
    
    <div v-else>
      <!-- Fleet Overview -->
      <section v-if="fleetOverview" class="fleet-overview">
        <h3>Fleet Overview</h3>
        <div class="overview-stats">
          <div class="stat">
            <h4>Total Vehicles</h4>
            <p>{{ fleetOverview.summary.totalVehicles }}</p>
          </div>
          <div class="stat">
            <h4>Total Drivers</h4>
            <p>{{ fleetOverview.summary.totalDrivers }}</p>
          </div>
          <div class="stat">
            <h4>Compliance Score</h4>
            <p>{{ fleetOverview.summary.overallComplianceScore }}%</p>
          </div>
          <div class="stat">
            <h4>Fleet Utilization</h4>
            <p>{{ fleetOverview.summary.fleetUtilization }}%</p>
          </div>
        </div>
        
        <div class="alerts">
          <h4>Active Alerts</h4>
          <div 
            v-for="(alert, index) in fleetOverview.alerts" 
            :key="index"
            :class="['alert', alert.type]"
          >
            <p class="alert-title">{{ alert.description }}</p>
            <p class="alert-severity">Severity: {{ alert.severity }}</p>
            <p class="alert-count">Count: {{ alert.count }}</p>
          </div>
        </div>
      </section>

      <!-- Vehicle Compliance -->
      <section class="vehicle-compliance">
        <h3>Vehicle Compliance</h3>
        <div class="compliance-list">
          <div 
            v-for="vehicle in vehicleCompliance" 
            :key="vehicle._id"
            :class="['vehicle-card', vehicle.compliance.status]"
          >
            <h4>{{ vehicle.registrationNumber }} - {{ vehicle.make }} {{ vehicle.model }}</h4>
            <div class="compliance-score">
              Score: {{ vehicle.compliance.score }}%
            </div>
            <div class="compliance-details">
              <p>Insurance: {{ vehicle.compliance.insurance.status }}</p>
              <p>Registration: {{ vehicle.compliance.registration.status }}</p>
              <p>Inspection: {{ vehicle.compliance.inspection.status }}</p>
            </div>
            <div v-if="vehicle.compliance.issues.length > 0" class="issues">
              <h5>Issues:</h5>
              <p 
                v-for="(issue, index) in vehicle.compliance.issues" 
                :key="index"
                class="issue"
              >
                {{ issue }}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import api from '../api/axios';
import { handleApiError } from '../utils/errorHandler';

export default {
  name: 'NTSADashboard',
  props: {
    schoolId: {
      type: String,
      required: true
    }
  },
  setup(props) {
    const fleetOverview = ref(null);
    const vehicleCompliance = ref([]);
    const driverCompliance = ref([]);
    const routeSafety = ref([]);
    const loading = ref(true);
    const error = ref(null);

    const fetchNTSAData = async () => {
      try {
        loading.value = true;
        
        const [fleet, vehicles, drivers, routes] = await Promise.all([
          api.get('/ntsa/fleet/overview', { params: { schoolId: props.schoolId } }),
          api.get('/ntsa/vehicles/compliance-status', { params: { schoolId: props.schoolId } }),
          api.get('/ntsa/drivers/license-status', { params: { schoolId: props.schoolId } }),
          api.get('/ntsa/routes/safety-analysis', { params: { schoolId: props.schoolId } })
        ]);

        fleetOverview.value = fleet.data.data;
        vehicleCompliance.value = vehicles.data.data;
        driverCompliance.value = drivers.data.data;
        routeSafety.value = routes.data.data;
      } catch (err) {
        error.value = handleApiError(err).message;
      } finally {
        loading.value = false;
      }
    };

    onMounted(fetchNTSAData);

    return {
      fleetOverview,
      vehicleCompliance,
      driverCompliance,
      routeSafety,
      loading,
      error
    };
  }
};
</script>

<style scoped>
.ntsa-dashboard {
  padding: 20px;
}

.overview-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin: 20px 0;
}

.stat {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  text-align: center;
}

.stat h4 {
  margin: 0 0 10px 0;
  color: #666;
}

.stat p {
  font-size: 24px;
  font-weight: bold;
  margin: 0;
}

.alerts {
  margin-top: 20px;
}

.alert {
  padding: 15px;
  margin-bottom: 10px;
  border-radius: 4px;
}

.alert.insurance_expiry {
  background: #fff3cd;
  border: 1px solid #ffeaa7;
}

.alert.license_expiry {
  background: #d1ecf1;
  border: 1px solid #bee5eb;
}

.compliance-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.vehicle-card {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 20px;
  background: white;
}

.vehicle-card.compliant {
  border-left: 4px solid #28a745;
}

.vehicle-card.non-compliant {
  border-left: 4px solid #dc3545;
}

.compliance-score {
  font-size: 18px;
  font-weight: bold;
  margin: 10px 0;
}

.issues {
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid #eee;
}

.issue {
  color: #dc3545;
  margin: 5px 0;
}
</style>
```

---

## Testing Endpoints

### Using Postman Collection
```json
{
  "info": {
    "name": "School Management API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:5000/api/v1",
      "type": "string"
    },
    {
      "key": "token",
      "value": "",
      "type": "string"
    }
  ],
  "auth": {
    "type": "bearer",
    "bearer": [
      {
        "key": "token",
        "value": "{{token}}",
        "type": "string"
      }
    ]
  },
  "item": [
    {
      "name": "Authentication",
      "item": [
        {
          "name": "Login",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"email\": \"admin@sacco.com\",\n  \"password\": \"admin123\"\n}"
            },
            "url": {
              "raw": "{{baseUrl}}/auth/login",
              "host": ["{{baseUrl}}"],
              "path": ["auth", "login"]
            }
          },
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "if (pm.response.code === 200) {",
                  "    const response = pm.response.json();",
                  "    pm.collectionVariables.set('token', response.token);",
                  "}"
                ]
              }
            }
          ]
        }
      ]
    },
    {
      "name": "Schools",
      "item": [
        {
          "name": "Get All Schools",
          "request": {
            "method": "GET",
            "url": {
              "raw": "{{baseUrl}}/schools",
              "host": ["{{baseUrl}}"],
              "path": ["schools"]
            }
          }
        },
        {
          "name": "Create School",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"name\": \"Test School\",\n  \"code\": \"TST001\",\n  \"type\": \"primary\",\n  \"address\": {\n    \"street\": \"123 Test Street\",\n    \"city\": \"Nairobi\",\n    \"state\": \"Nairobi County\",\n    \"postalCode\": \"00100\",\n    \"country\": \"Kenya\"\n  },\n  \"contactEmail\": \"test@school.edu\",\n  \"contactPhone\": \"+254-712-345-678\"\n}"
            },
            "url": {
              "raw": "{{baseUrl}}/schools",
              "host": ["{{baseUrl}}"],
              "path": ["schools"]
            }
          }
        }
      ]
    },
    {
      "name": "NTSA Compliance",
      "item": [
        {
          "name": "Fleet Overview",
          "request": {
            "method": "GET",
            "url": {
              "raw": "{{baseUrl}}/ntsa/fleet/overview",
              "host": ["{{baseUrl}}"],
              "path": ["ntsa", "fleet", "overview"]
            }
          }
        },
        {
          "name": "Vehicle Compliance",
          "request": {
            "method": "GET",
            "url": {
              "raw": "{{baseUrl}}/ntsa/vehicles/compliance-status",
              "host": ["{{baseUrl}}"],
              "path": ["ntsa", "vehicles", "compliance-status"]
            }
          }
        }
      ]
    }
  ]
}
```

### Using cURL Commands
```bash
# Login
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@sacco.com","password":"admin123"}'

# Get Schools (replace TOKEN with actual token)
curl -X GET http://localhost:5000/api/v1/schools \
  -H "Authorization: Bearer TOKEN"

# Create School
curl -X POST http://localhost:5000/api/v1/schools \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test School",
    "code": "TST001",
    "type": "primary",
    "address": {
      "street": "123 Test Street",
      "city": "Nairobi",
      "state": "Nairobi County",
      "postalCode": "00100",
      "country": "Kenya"
    },
    "contactEmail": "test@school.edu",
    "contactPhone": "+254-712-345-678"
  }'

# Get NTSA Fleet Overview
curl -X GET http://localhost:5000/api/v1/ntsa/fleet/overview \
  -H "Authorization: Bearer TOKEN"

# Get Vehicle Compliance
curl -X GET http://localhost:5000/api/v1/ntsa/vehicles/compliance-status \
  -H "Authorization: Bearer TOKEN"
```

---

## Best Practices

### 1. Authentication Management
- Store JWT tokens securely (localStorage or httpOnly cookies)
- Implement token refresh mechanism
- Handle token expiration gracefully
- Use role-based access control

### 2. Error Handling
- Implement centralized error handling
- Show user-friendly error messages
- Log errors for debugging
- Handle network errors gracefully

### 3. Performance Optimization
- Implement pagination for large datasets
- Use caching for frequently accessed data
- Implement lazy loading for components
- Optimize API calls with debouncing/throttling

### 4. Data Validation
- Validate user input before sending to API
- Handle validation errors from server
- Implement form validation with user feedback
- Sanitize user input

### 5. Security
- Never store sensitive data in frontend
- Implement HTTPS in production
- Validate and sanitize all inputs
- Use secure storage for tokens

### 6. User Experience
- Show loading states during API calls
- Implement optimistic updates where appropriate
- Provide feedback for user actions
- Handle offline scenarios gracefully

---

This comprehensive guide provides everything needed to integrate the school management, parent management, and NTSA policy enforcement endpoints into your frontend application. The examples cover both React and Vue implementations, with proper error handling, authentication, and best practices.

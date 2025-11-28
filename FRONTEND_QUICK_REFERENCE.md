# Frontend API Quick Reference

## 🚀 Quick Start

### Base URLs
```
Development: http://localhost:5000/api/v1
Production: https://your-domain.com/api/v1
```

### Authentication
```javascript
headers: {
  'Content-Type': 'application/json',
  'Authorization': 'Bearer <JWT_TOKEN>'
}
```

---

## 🏫 School Management

### Schools
```http
GET    /schools                    # Get all schools
POST   /schools                    # Create school
GET    /schools/:id                # Get school by ID
PUT    /schools/:id                # Update school
DELETE /schools/:id                # Delete school
```

### Students
```http
GET    /schools/students           # Get students (filter by schoolId)
POST   /schools/students           # Create student
GET    /schools/students/:id       # Get student by ID
PUT    /schools/students/:id       # Update student
DELETE /schools/students/:id       # Delete student
```

### Vehicles
```http
GET    /schools/vehicles           # Get vehicles (filter by schoolId)
POST   /schools/vehicles           # Create vehicle
GET    /schools/vehicles/:id       # Get vehicle by ID
PUT    /schools/vehicles/:id       # Update vehicle
PUT    /schools/vehicles/:id/location # Update vehicle location
DELETE /schools/vehicles/:id       # Delete vehicle
```

### Drivers
```http
GET    /schools/drivers            # Get drivers (filter by schoolId)
POST   /schools/drivers            # Create driver
GET    /schools/drivers/:id        # Get driver by ID
PUT    /schools/drivers/:id        # Update driver
DELETE /schools/drivers/:id        # Delete driver
```

### Routes
```http
GET    /schools/routes             # Get routes (filter by schoolId)
POST   /schools/routes             # Create route
GET    /schools/routes/:id         # Get route by ID
PUT    /schools/routes/:id         # Update route
DELETE /schools/routes/:id         # Delete route
```

### Trips
```http
GET    /schools/trips              # Get trips (filter by schoolId, status)
POST   /schools/trips              # Create/start trip
GET    /schools/trips/:id          # Get trip by ID
PUT    /schools/trips/:id          # Update trip
DELETE /schools/trips/:id          # Delete trip
```

---

## 🚔 NTSA Regulatory

### Dashboard
```http
GET    /ntsa/dashboard             # NTSA dashboard overview
```

### Vehicle Compliance
```http
GET    /ntsa/vehicles/compliance-status    # School vehicle compliance
GET    /ntsa/vehicles/insurance-expiry     # Insurance expiry tracking
GET    /ntsa/vehicles/inspection-status    # Inspection status
GET    /ntsa/vehicles/safety-features      # Safety features
GET    /ntsa/vehicles/all-compliance       # All vehicles (School + Regular)
GET    /ntsa/vehicles/plate/:plateNumber   # Search by plate number
```

### Driver Compliance
```http
GET    /ntsa/drivers/license-status         # License status
GET    /ntsa/drivers/medical-clearance      # Medical clearance
GET    /ntsa/drivers/training-certificates  # Training certificates
GET    /ntsa/drivers/performance-metrics    # Performance metrics
GET    /ntsa/drivers/all-compliance         # All drivers (School + Regular)
GET    /ntsa/drivers/national-id/:nationalId # Search by national ID
```

### Route Compliance
```http
GET    /ntsa/routes/safety-analysis        # Route safety analysis
GET    /ntsa/routes/overcrowding-reports   # Overcrowding reports
GET    /ntsa/routes/incident-hotspots       # Incident hotspots
GET    /ntsa/routes/compliance-metrics      # Compliance metrics
```

### Course Compliance
```http
GET    /ntsa/courses/compliance             # Course compliance
GET    /ntsa/courses/route/:routeNumber     # Search by route number
```

### Analytics & Reports
```http
GET    /ntsa/compliance-alerts              # Compliance alerts
GET    /ntsa/fleet-analytics                # Fleet analytics
GET    /ntsa/monthly-reports                # Monthly reports
GET    /ntsa/fleet/overview                 # Fleet overview
```

### Field Officer Tools
```http
GET    /ntsa/vehicle-scan/:regNumber        # QR code scan
GET    /ntsa/driver-verify/:licenseNumber   # Driver verification
GET    /ntsa/inspection-report/:vehicleId   # Inspection report
GET    /ntsa/compliance-check/:schoolId     # School compliance check
```

---

## 👨‍👩‍👧‍👦 Parent Portal

### Dashboard
```http
GET    /parents/dashboard           # Parent dashboard
```

### Student Tracking
```http
GET    /parents/students/:id/location     # Student current location
GET    /parents/students/:id/trips       # Student trip history
GET    /parents/students/:id/attendance  # Student attendance
```

### Notifications
```http
GET    /parents/notifications            # Get notifications
PUT    /parents/notifications/:id/read   # Mark as read
GET    /parents/settings/notifications   # Notification settings
PUT    /parents/settings/notifications   # Update settings
```

### Communication
```http
POST   /parents/messages                 # Send message to school
GET    /parents/messages                 # Message history
GET    /parents/messages/:id             # Get message details
```

---

## 🔐 Authentication

### Login
```http
POST   /auth/login
```

**Request Body:**
```json
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

### Logout
```http
POST   /auth/logout
```

### Refresh Token
```http
POST   /auth/refresh
```

---

## 📊 Common Query Parameters

### Pagination
```
page=1          # Page number (default: 1)
limit=20        # Items per page (default: 10, max: 100)
```

### Filtering
```
schoolId=64a1b2c3d4e5f6789012345    # Filter by school
status=active                        # Filter by status
startDate=2024-01-01                 # Date range start
endDate=2024-12-31                   # Date range end
```

### Sorting
```
sort=name                            # Sort by field
order=asc                            # Sort order (asc|desc)
```

### Search
```
search=john                          # Search term
```

---

## 🎯 Quick Examples

### Get Parent Dashboard
```javascript
const getDashboard = async () => {
  try {
    const response = await fetch('/api/v1/parents/dashboard', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error:', error);
  }
};
```

### Get Student Location
```javascript
const getStudentLocation = async (studentId) => {
  try {
    const response = await fetch(`/api/v1/parents/students/${studentId}/location`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Error:', error);
  }
};
```

### Get NTSA Dashboard
```javascript
const getNtsaDashboard = async (schoolId) => {
  try {
    const response = await fetch(`/api/v1/ntsa/dashboard?schoolId=${schoolId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Error:', error);
  }
};
```

### Search Vehicle by Plate
```javascript
const searchVehicle = async (plateNumber) => {
  try {
    const response = await fetch(`/api/v1/ntsa/vehicles/plate/${plateNumber}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Error:', error);
  }
};
```

### Update Vehicle Location
```javascript
const updateVehicleLocation = async (vehicleId, location) => {
  try {
    const response = await fetch(`/api/v1/schools/vehicles/${vehicleId}/location`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(location)
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error:', error);
  }
};
```

---

## 📱 Real-time Updates

### WebSocket Connection
```javascript
const ws = new WebSocket('ws://localhost:5000');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  switch (data.type) {
    case 'location_update':
      // Update vehicle location on map
      updateVehicleMap(data.payload);
      break;
    case 'trip_update':
      // Update trip status
      updateTripStatus(data.payload);
      break;
    case 'notification':
      // Show notification
      showNotification(data.payload);
      break;
  }
};
```

### Message Types
- `location_update` - Vehicle location updates
- `trip_update` - Trip status changes
- `notification` - New notifications
- `alert` - Emergency alerts
- `compliance_update` - Compliance status changes

---

## ⚠️ Error Handling

### Common Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `422` - Validation Error
- `429` - Too Many Requests
- `500` - Server Error

### Error Response Format
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "email",
    "message": "Email is required"
  }
}
```

---

## 🛠 Development Tips

### Token Storage
```javascript
// Store token
localStorage.setItem('token', token);

// Get token
const token = localStorage.getItem('token');

// Remove token
localStorage.removeItem('token');
```

### API Client Setup
```javascript
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
```

### Loading States
```javascript
const [loading, setLoading] = useState(false);
const [data, setData] = useState(null);

const fetchData = async () => {
  setLoading(true);
  try {
    const response = await api.get('/endpoint');
    setData(response.data);
  } catch (error) {
    console.error(error);
  } finally {
    setLoading(false);
  }
};
```

---

## 📞 Support

### Documentation
- Full API Documentation: `FRONTEND_API_DOCUMENTATION.md`
- NTSA Integration Guide: `NTSA_EXTENDED_INTEGRATION.md`
- Regulatory Guide: `NTSA_REGULATORY_GUIDE.md`

### Common Issues
1. **CORS**: Check API URL configuration
2. **Auth**: Verify token storage and refresh
3. **Rate Limits**: Implement caching and debouncing
4. **WebSocket**: Check connection status

### Contact
- **Technical Support**: technical-support@example.com
- **API Questions**: api-support@example.com

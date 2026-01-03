# Database Seeder

This directory contains comprehensive database seeding scripts for the School Transport Management System with NTSA integration.

## 🎯 Purpose

The seeder creates realistic test data for all system components:
- **Schools** with complete information
- **Users** (Admin, NTSA Officers, Staff, Parents)
- **Vehicles** (School and Regular vehicles)
- **Drivers** (School and Regular drivers)
- **Routes** and **Courses**
- **Students** with transportation details
- **Parents** with notification preferences
- **Incidents** and **Alerts** for NTSA compliance

## 🚀 Quick Start

### Method 1: Direct Execution
```bash
cd seed
node runSeeder.js
```

### Method 2: From Project Root
```bash
node seed/runSeeder.js
```

### Method 3: Using npm script (add to package.json)
```json
{
  "scripts": {
    "seed": "node seed/runSeeder.js"
  }
}
```
Then run:
```bash
npm run seed
```

## 📊 Data Overview

### Schools (5)
- Nairobi Primary School
- Mombasa Academy
- Kisumu International School
- Nakuru Heights Academy
- Eldoret Elite School

### Users
- **Admin**: System administrator
- **NTSA Officers**: Officer, Inspector, Analyst
- **School Staff**: One staff user per school
- **Parents**: 2 parents per student

### Vehicles
- **School Vehicles**: 3 per school (15 total)
  - Toyota Hiace, Coaster, Nissan Civilian
  - Complete safety features and maintenance records
- **Regular Vehicles**: 10 total
  - Various makes and models
  - Performance tracking

### Drivers
- **School Drivers**: 4 per school (20 total)
  - Complete licensing and medical records
  - Training certifications
- **Regular Drivers**: 8 total
  - Professional licensing

### Students
- **25 students per school** (125 total)
- Complete transportation assignments
- Medical information and emergency contacts

### Routes & Courses
- **4 routes per school** (20 total)
- **3 courses per school** (15 total)
- **8 regular courses** (public transport)

### Compliance Data
- **Incidents**: 2 per school (10 total)
- **Alerts**: 5 per school (25 total)

## 🔑 Login Credentials

After seeding, you can use these credentials:

### System Access
- **Admin**: `admin@sacco.com` / `admin123`
- **NTSA Officer**: `j.kamau@ntsa.go.ke` / `ntsa123`
- **NTSA Inspector**: `g.wanjiru@ntsa.go.ke` / `ntsa123`
- **NTSA Analyst**: `p.ochieng@ntsa.go.ke` / `ntsa123`

### School Staff
- **Nairobi Primary**: `staff@nps001.edu` / `staff123`
- **Mombasa Academy**: `staff@mas002.edu` / `staff123`
- **Kisumu Intl**: `staff@kis003.edu` / `staff123`
- **Nakuru Heights**: `staff@nha004.edu` / `staff123`
- **Eldoret Elite**: `staff@ees005.edu` / `staff123`

### Parents
- **Format**: `[firstname].[lastname][number]@parent.com`
- **Password**: `parent123`

## 📍 Geographic Data

The seeder uses real Kenyan locations:
- **Nairobi**: [-1.2921, 36.8219]
- **Mombasa**: [-4.0435, 39.6682]
- **Kisumu**: [-0.1022, 34.7617]
- **Nakuru**: [-0.3031, 36.0639]
- **Eldoret**: [0.5143, 35.2698]
- And more...

## 🛠 Configuration

### Seed Configuration
You can modify the seed amounts in `databaseSeeder.js`:

```javascript
const seedConfig = {
  schools: 5,
  vehiclesPerSchool: 3,
  driversPerSchool: 4,
  routesPerSchool: 4,
  studentsPerSchool: 25,
  parentsPerStudent: 2,
  coursesPerSchool: 3,
  incidentsPerSchool: 2,
  alertsPerSchool: 5
};
```

### Environment Variables
Make sure your `.env` file contains:
```env
MONGO_URI=mongodb://localhost:27017/sacco_transport
NODE_ENV=development
```

## 📋 Features Included

### NTSA Compliance
- **Vehicle Compliance**: Insurance, registration, safety features
- **Driver Compliance**: Licenses, medical certificates, training
- **Route Compliance**: Safety analysis, capacity monitoring
- **Incidents**: Complete incident reporting system
- **Alerts**: Compliance and safety alerts

### Realistic Data
- **Kenyan Names**: Authentic first and last names
- **Real Locations**: Actual Kenyan coordinates
- **Vehicle Models**: Common vehicles in Kenya
- **Phone Numbers**: Kenyan phone format
- **Dates**: Realistic date ranges

### Relationships
- **School ↔ Students**: Proper enrollment
- **Students ↔ Parents**: Family relationships
- **Vehicles ↔ Drivers**: Current assignments
- **Routes ↔ Stops**: Complete route definitions
- **Courses ↔ Vehicles**: Vehicle assignments

## 🔍 Testing Scenarios

### NTSA Dashboard Testing
- Login as NTSA officer to see compliance overview
- Search vehicles by plate number
- Verify drivers by national ID
- View incident reports and alerts

### Parent Portal Testing
- Login as parent to track student location
- View trip history and notifications
- Update notification preferences
- Send messages to school

### School Management Testing
- Login as school staff
- Manage vehicles, drivers, and routes
- View student transportation details
- Handle incidents and alerts

## 🚨 Important Notes

### Database Reset
The seeder will **DELETE ALL EXISTING DATA** before seeding new data. Make sure to backup any important data before running.

### Performance
The seeder creates approximately 500+ documents, which may take a few minutes to complete depending on your system.

### Validation
All seeded data passes model validation and follows the schema requirements.

## 🐛 Troubleshooting

### Common Issues

1. **Connection Error**
   ```
   Error: connect ECONNREFUSED 127.0.0.1:27017
   ```
   **Solution**: Make sure MongoDB is running

2. **Environment Variables Not Found**
   ```
   MONGO_URI not found in environment variables
   ```
   **Solution**: Check your config.env file path

3. **Permission Denied**
   ```
   Error: Authentication failed
   ```
   **Solution**: Check MongoDB credentials

### Debug Mode
For detailed debugging, modify `runSeeder.js` to add more console.log statements.

## 📞 Support

If you encounter issues:
1. Check MongoDB connection
2. Verify environment variables
3. Review error messages
4. Check model schemas for validation errors

## 🔄 Re-running the Seeder

You can safely re-run the seeder multiple times. It will:
1. Clear all existing data
2. Create fresh data with the same structure
3. Generate new random variations of data

## 📈 Performance Testing

The seeded data is suitable for:
- **Load Testing**: Simulate real-world usage
- **UI Testing**: Populate frontend with realistic data
- **API Testing**: Test all endpoints with real data
- **Integration Testing**: Test system workflows

---

**Happy Testing! 🎉**

The comprehensive seed data provides a realistic environment for testing all features of the School Transport Management System with NTSA integration.

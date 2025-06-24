const Vehicle = require('../models/Vehicle');
const Driver = require('../models/Driver');
const Course = require('../models/Course');
const Fare = require('../models/Fare');
const Performance = require('../models/Performance');
const VehicleLocationHistory = require('../models/VehicleLocationHistory');
const LocationTrigger = require('../models/LocationTrigger');
const User = require('../models/User');

class AnalyticsService {
  // ==================== BUSINESS DATA & ANALYTICS ====================

  // Financial Metrics
  async getFinancialMetrics(timeRange = 'month') {
    const dateFilter = this.getDateFilter(timeRange);
    
    // Aggregate financial data from vehicles
    const financialData = await Vehicle.aggregate([
      { $match: { createdAt: dateFilter } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalIncome' },
          totalExpenses: { $sum: { $multiply: ['$mileage', 0.15] } }, // Estimated fuel cost
          totalVehicles: { $sum: 1 },
          averageDailyIncome: { $avg: '$averageDailyIncome' },
          totalPassengers: { $sum: '$totalPassengersFerried' }
        }
      }
    ]);

    const data = financialData[0] || {
      totalRevenue: 0,
      totalExpenses: 0,
      totalVehicles: 0,
      averageDailyIncome: 0,
      totalPassengers: 0
    };

    return {
      revenue: {
        total: data.totalRevenue,
        averageDaily: data.averageDailyIncome,
        perVehicle: data.totalVehicles > 0 ? data.totalRevenue / data.totalVehicles : 0,
        perPassenger: data.totalPassengers > 0 ? data.totalRevenue / data.totalPassengers : 0
      },
      expenses: {
        total: data.totalExpenses,
        fuel: data.totalExpenses * 0.6, // 60% of expenses
        maintenance: data.totalExpenses * 0.25, // 25% of expenses
        other: data.totalExpenses * 0.15 // 15% of expenses
      },
      profitability: {
        netIncome: data.totalRevenue - data.totalExpenses,
        profitMargin: data.totalRevenue > 0 ? ((data.totalRevenue - data.totalExpenses) / data.totalRevenue) * 100 : 0,
        costPerKm: data.totalExpenses / (data.totalVehicles * 100) // Assuming 100km per vehicle
      },
      trends: await this.getFinancialTrends(timeRange)
    };
  }

  // Operational Efficiency
  async getOperationalEfficiency() {
    const vehicles = await Vehicle.find().populate('assignedRoute');
    
    const efficiencyData = vehicles.reduce((acc, vehicle) => {
      const utilization = vehicle.status === 'in_use' ? 1 : 0;
      const capacityUtilization = vehicle.totalPassengersFerried / (vehicle.seatingCapacity * vehicle.totalTrips) || 0;
      
      return {
        totalVehicles: acc.totalVehicles + 1,
        activeVehicles: acc.activeVehicles + utilization,
        totalCapacity: acc.totalCapacity + vehicle.seatingCapacity,
        totalPassengers: acc.totalPassengers + vehicle.totalPassengersFerried,
        totalTrips: acc.totalTrips + vehicle.totalTrips,
        totalMileage: acc.totalMileage + vehicle.mileage
      };
    }, {
      totalVehicles: 0,
      activeVehicles: 0,
      totalCapacity: 0,
      totalPassengers: 0,
      totalTrips: 0,
      totalMileage: 0
    });

    return {
      vehicleUtilization: {
        total: efficiencyData.totalVehicles,
        active: efficiencyData.activeVehicles,
        utilizationRate: efficiencyData.totalVehicles > 0 ? (efficiencyData.activeVehicles / efficiencyData.totalVehicles) * 100 : 0,
        capacityUtilization: efficiencyData.totalTrips > 0 ? (efficiencyData.totalPassengers / (efficiencyData.totalCapacity * efficiencyData.totalTrips)) * 100 : 0
      },
      routePerformance: await this.getRoutePerformance(),
      resourceOptimization: {
        fuelEfficiency: efficiencyData.totalMileage > 0 ? (efficiencyData.totalMileage * 0.08) : 0, // L/100km
        maintenanceSchedule: await this.getMaintenanceSchedule(),
        assetUtilization: efficiencyData.totalMileage / efficiencyData.totalVehicles || 0
      },
      operationalCosts: {
        perVehicle: efficiencyData.totalVehicles > 0 ? (efficiencyData.totalMileage * 0.15) / efficiencyData.totalVehicles : 0,
        perRoute: await this.getPerRouteCosts(),
        totalCosts: efficiencyData.totalMileage * 0.15
      }
    };
  }

  // Business Intelligence
  async getBusinessIntelligence() {
    const routes = await Course.find().populate('assignedVehicles');
    const locationHistory = await VehicleLocationHistory.find({
      timestamp: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
    });

    return {
      marketAnalysis: {
        routePopularity: await this.getRoutePopularity(routes),
        passengerDemand: await this.getPassengerDemandPatterns(locationHistory),
        peakHours: await this.getPeakHours(locationHistory)
      },
      competitiveIntelligence: {
        serviceQuality: await this.getServiceQualityMetrics(),
        marketPosition: await this.getMarketPositionMetrics()
      },
      growthOpportunities: {
        newRoutes: await this.identifyNewRouteOpportunities(),
        expansionPotential: await this.getExpansionPotential()
      },
      riskAssessment: {
        financialRisks: await this.getFinancialRisks(),
        operationalVulnerabilities: await this.getOperationalVulnerabilities()
      }
    };
  }

  // ==================== POLICY & REGULATORY COMPLIANCE ====================

  // Safety & Compliance Monitoring
  async getComplianceData() {
    const drivers = await Driver.find();
    const vehicles = await Vehicle.find();
    
    const complianceData = {
      driverCompliance: {
        expiringLicenses: [],
        expiringPSV: [],
        expiringMedical: [],
        complianceScore: 0
      },
      vehicleCompliance: {
        expiringInsurance: [],
        maintenanceDue: [],
        registrationStatus: [],
        complianceScore: 0
      },
      safetyMetrics: {
        totalIncidents: 0,
        safetyScore: 0,
        riskLevel: 'low'
      }
    };

    // Check driver compliance
    drivers.forEach(driver => {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      if (driver.driverLicense.expiryDate < thirtyDaysFromNow) {
        complianceData.driverCompliance.expiringLicenses.push({
          driverId: driver._id,
          driverName: driver.driverName,
          licenseNumber: driver.driverLicense.number,
          expiryDate: driver.driverLicense.expiryDate,
          daysUntilExpiry: Math.ceil((driver.driverLicense.expiryDate - new Date()) / (1000 * 60 * 60 * 24))
        });
      }

      if (driver.psvLicense.expiryDate < thirtyDaysFromNow) {
        complianceData.driverCompliance.expiringPSV.push({
          driverId: driver._id,
          driverName: driver.driverName,
          psvNumber: driver.psvLicense.number,
          expiryDate: driver.psvLicense.expiryDate,
          daysUntilExpiry: Math.ceil((driver.psvLicense.expiryDate - new Date()) / (1000 * 60 * 60 * 24))
        });
      }

      if (driver.medicalCertificate?.expiryDate < thirtyDaysFromNow) {
        complianceData.driverCompliance.expiringMedical.push({
          driverId: driver._id,
          driverName: driver.driverName,
          expiryDate: driver.medicalCertificate.expiryDate,
          daysUntilExpiry: Math.ceil((driver.medicalCertificate.expiryDate - new Date()) / (1000 * 60 * 60 * 24))
        });
      }
    });

    // Check vehicle compliance
    vehicles.forEach(vehicle => {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      if (vehicle.insuranceExpiry && vehicle.insuranceExpiry < thirtyDaysFromNow) {
        complianceData.vehicleCompliance.expiringInsurance.push({
          vehicleId: vehicle._id,
          plateNumber: vehicle.plateNumber,
          expiryDate: vehicle.insuranceExpiry,
          daysUntilExpiry: Math.ceil((vehicle.insuranceExpiry - new Date()) / (1000 * 60 * 60 * 24))
        });
      }

      if (vehicle.nextMaintenance && vehicle.nextMaintenance < thirtyDaysFromNow) {
        complianceData.vehicleCompliance.maintenanceDue.push({
          vehicleId: vehicle._id,
          plateNumber: vehicle.plateNumber,
          dueDate: vehicle.nextMaintenance,
          daysUntilDue: Math.ceil((vehicle.nextMaintenance - new Date()) / (1000 * 60 * 60 * 24))
        });
      }
    });

    // Calculate compliance scores
    const totalDrivers = drivers.length;
    const totalVehicles = vehicles.length;
    
    complianceData.driverCompliance.complianceScore = totalDrivers > 0 ? 
      ((totalDrivers - complianceData.driverCompliance.expiringLicenses.length - 
        complianceData.driverCompliance.expiringPSV.length - 
        complianceData.driverCompliance.expiringMedical.length) / totalDrivers) * 100 : 0;
    
    complianceData.vehicleCompliance.complianceScore = totalVehicles > 0 ? 
      ((totalVehicles - complianceData.vehicleCompliance.expiringInsurance.length - 
        complianceData.vehicleCompliance.maintenanceDue.length) / totalVehicles) * 100 : 0;

    return complianceData;
  }

  // ==================== CONSUMER/PASSENGER DATA ====================

  // Service Quality Metrics
  async getServiceQualityMetrics() {
    const vehicles = await Vehicle.find();
    const locationHistory = await VehicleLocationHistory.find({
      timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
    });

    const qualityMetrics = {
      onTimePerformance: await this.calculateOnTimePerformance(locationHistory),
      serviceReliability: await this.calculateServiceReliability(vehicles),
      passengerSatisfaction: await this.getPassengerSatisfaction(),
      comfortMetrics: await this.getComfortMetrics(vehicles)
    };

    return qualityMetrics;
  }

  // Passenger Experience
  async getPassengerExperience() {
    const locationHistory = await VehicleLocationHistory.find({
      timestamp: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
    });

    return {
      tripData: await this.getTripData(locationHistory),
      serviceFeedback: await this.getServiceFeedback(),
      accessibility: await this.getAccessibilityMetrics(),
      safetyPerception: await this.getSafetyPerception()
    };
  }

  // ==================== REAL-TIME MONITORING & ANALYTICS ====================

  // Live Operations Data
  async getLiveOperationsData() {
    const vehicles = await Vehicle.find({ status: 'in_use' });
    const activeTriggers = await LocationTrigger.find({ isActive: true });

    return {
      vehicleTracking: vehicles.map(vehicle => ({
        vehicleId: vehicle._id,
        plateNumber: vehicle.plateNumber,
        location: vehicle.currentLocation,
        speed: vehicle.averageSpeed,
        status: vehicle.status,
        route: vehicle.assignedRoute,
        driver: vehicle.currentDriver
      })),
      trafficConditions: await this.getTrafficConditions(),
      weatherIntegration: await this.getWeatherData(),
      performanceMonitoring: await this.getLivePerformanceMetrics()
    };
  }

  // Predictive Analytics
  async getPredictiveAnalytics() {
    return {
      maintenancePrediction: await this.predictMaintenanceNeeds(),
      routeOptimization: await this.getRouteOptimizationSuggestions(),
      demandForecasting: await this.forecastPassengerDemand(),
      riskAssessment: await this.getPredictiveRiskAssessment()
    };
  }

  // ==================== HELPER METHODS ====================

  getDateFilter(timeRange) {
    const now = new Date();
    switch (timeRange) {
      case 'day':
        return { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) };
      case 'week':
        return { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) };
      case 'month':
        return { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) };
      case 'quarter':
        return { $gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) };
      case 'year':
        return { $gte: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000) };
      default:
        return { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) };
    }
  }

  async getFinancialTrends(timeRange) {
    // This would typically query historical data
    // For now, returning mock data
    return {
      monthlyRevenue: [45000, 52000, 48000, 55000, 60000, 58000],
      monthlyExpenses: [35000, 38000, 36000, 42000, 45000, 43000],
      seasonalPatterns: {
        peak: ['December', 'January', 'July'],
        low: ['February', 'March', 'September']
      }
    };
  }

  async getRoutePerformance() {
    const routes = await Course.find().populate('assignedVehicles');
    
    return routes.map(route => ({
      routeId: route._id,
      routeName: route.routeName,
      routeNumber: route.routeNumber,
      onTimePercentage: Math.random() * 20 + 80, // Mock data
      efficiencyScore: Math.random() * 30 + 70, // Mock data
      totalTrips: route.assignedVehicles?.length * 10 || 0,
      averagePassengers: Math.floor(Math.random() * 20) + 10
    }));
  }

  async getMaintenanceSchedule() {
    const vehicles = await Vehicle.find();
    
    return vehicles.map(vehicle => ({
      vehicleId: vehicle._id,
      plateNumber: vehicle.plateNumber,
      lastMaintenance: vehicle.lastMaintenance,
      nextMaintenance: vehicle.nextMaintenance,
      status: vehicle.vehicleCondition,
      daysUntilMaintenance: vehicle.nextMaintenance ? 
        Math.ceil((vehicle.nextMaintenance - new Date()) / (1000 * 60 * 60 * 24)) : null
    }));
  }

  async getPerRouteCosts() {
    const routes = await Course.find();
    
    return routes.map(route => ({
      routeId: route._id,
      routeName: route.routeName,
      estimatedCost: Math.random() * 5000 + 2000, // Mock data
      profitability: Math.random() * 40 + 60 // Mock data
    }));
  }

  async getRoutePopularity(routes) {
    return routes.map(route => ({
      routeId: route._id,
      routeName: route.routeName,
      popularity: Math.random() * 100,
      passengerCount: Math.floor(Math.random() * 100) + 50
    }));
  }

  async getPassengerDemandPatterns(locationHistory) {
    // Analyze location history to determine demand patterns
    const hourlyDemand = new Array(24).fill(0);
    
    locationHistory.forEach(record => {
      const hour = new Date(record.timestamp).getHours();
      hourlyDemand[hour]++;
    });

    return {
      hourlyDemand,
      peakHours: [7, 8, 17, 18], // Mock peak hours
      lowHours: [2, 3, 4, 5] // Mock low hours
    };
  }

  async getPeakHours(locationHistory) {
    return {
      morning: [6, 7, 8, 9],
      afternoon: [12, 13, 14],
      evening: [17, 18, 19, 20],
      night: [21, 22, 23, 0, 1, 2, 3, 4, 5]
    };
  }

  async getServiceQualityMetrics() {
    return {
      averageRating: 4.2,
      responseTime: '2.5 minutes',
      customerSatisfaction: 85
    };
  }

  async getMarketPositionMetrics() {
    return {
      marketShare: 15.5,
      competitiveAdvantage: 'Route coverage',
      serviceDifferentiation: 'Real-time tracking'
    };
  }

  async identifyNewRouteOpportunities() {
    return [
      { route: 'Westlands to Thika', potential: 'High', estimatedRevenue: 25000 },
      { route: 'Nairobi to Machakos', potential: 'Medium', estimatedRevenue: 18000 },
      { route: 'CBD to JKIA', potential: 'High', estimatedRevenue: 30000 }
    ];
  }

  async getExpansionPotential() {
    return {
      newVehicles: 5,
      newRoutes: 3,
      estimatedInvestment: 2500000,
      projectedROI: 25
    };
  }

  async getFinancialRisks() {
    return [
      { risk: 'Fuel price volatility', probability: 'Medium', impact: 'High' },
      { risk: 'Regulatory changes', probability: 'Low', impact: 'Medium' },
      { risk: 'Economic downturn', probability: 'Medium', impact: 'High' }
    ];
  }

  async getOperationalVulnerabilities() {
    return [
      { vulnerability: 'Driver shortage', severity: 'High', mitigation: 'Recruitment drive' },
      { vulnerability: 'Vehicle breakdowns', severity: 'Medium', mitigation: 'Preventive maintenance' },
      { vulnerability: 'Route congestion', severity: 'Low', mitigation: 'Route optimization' }
    ];
  }

  async calculateOnTimePerformance(locationHistory) {
    // Mock calculation based on location history
    const totalTrips = locationHistory.length;
    const onTimeTrips = Math.floor(totalTrips * 0.85); // 85% on-time performance
    
    return {
      percentage: 85,
      totalTrips,
      onTimeTrips,
      delayedTrips: totalTrips - onTimeTrips
    };
  }

  async calculateServiceReliability(vehicles) {
    const totalVehicles = vehicles.length;
    const operationalVehicles = vehicles.filter(v => v.status === 'in_use' || v.status === 'available').length;
    
    return {
      reliability: (operationalVehicles / totalVehicles) * 100,
      totalVehicles,
      operationalVehicles,
      maintenanceVehicles: vehicles.filter(v => v.status === 'maintenance').length
    };
  }

  async getPassengerSatisfaction() {
    return {
      overallRating: 4.3,
      cleanliness: 4.1,
      punctuality: 4.2,
      safety: 4.5,
      comfort: 4.0
    };
  }

  async getComfortMetrics(vehicles) {
    return {
      averageCondition: 'Good',
      cleanlinessScore: 4.2,
      temperatureControl: 4.0,
      seatingComfort: 4.1
    };
  }

  async getTripData(locationHistory) {
    const totalTrips = locationHistory.length;
    const uniqueVehicles = new Set(locationHistory.map(record => record.vehicleId.toString())).size;
    
    return {
      totalTrips,
      uniqueVehicles,
      averageTripDuration: 45, // minutes
      peakHourAnalysis: await this.getPeakHours(locationHistory)
    };
  }

  async getServiceFeedback() {
    return {
      complaints: 12,
      suggestions: 25,
      compliments: 45,
      improvementRequests: 8
    };
  }

  async getAccessibilityMetrics() {
    return {
      serviceAvailability: 95,
      routeCoverage: 85,
      accessibilityScore: 90
    };
  }

  async getSafetyPerception() {
    return {
      safetyRating: 4.4,
      incidentReports: 2,
      safetyScore: 92
    };
  }

  async getTrafficConditions() {
    return {
      congestionLevel: 'Medium',
      averageSpeed: 25, // km/h
      routeOptimization: 'Active'
    };
  }

  async getWeatherData() {
    return {
      condition: 'Partly Cloudy',
      temperature: 22,
      alerts: []
    };
  }

  async getLivePerformanceMetrics() {
    return {
      activeVehicles: 15,
      totalPassengers: 250,
      averageSpeed: 28,
      alerts: 3
    };
  }

  async predictMaintenanceNeeds() {
    const vehicles = await Vehicle.find();
    
    return vehicles.map(vehicle => ({
      vehicleId: vehicle._id,
      plateNumber: vehicle.plateNumber,
      predictedMaintenance: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      confidence: Math.random() * 20 + 80,
      recommendedActions: ['Oil change', 'Tire rotation']
    }));
  }

  async getRouteOptimizationSuggestions() {
    return [
      { route: 'Route 1', suggestion: 'Avoid Mombasa Road during peak hours', impact: 'High' },
      { route: 'Route 2', suggestion: 'Add express service', impact: 'Medium' },
      { route: 'Route 3', suggestion: 'Optimize stop timing', impact: 'Low' }
    ];
  }

  async forecastPassengerDemand() {
    return {
      nextWeek: 1200,
      nextMonth: 4800,
      nextQuarter: 14400,
      confidence: 85
    };
  }

  async getPredictiveRiskAssessment() {
    return {
      highRiskVehicles: 2,
      highRiskDrivers: 1,
      highRiskRoutes: 1,
      overallRiskLevel: 'Low'
    };
  }
}

module.exports = new AnalyticsService(); 
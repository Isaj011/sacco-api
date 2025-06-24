const Vehicle = require('../models/Vehicle');
const Driver = require('../models/Driver');
const Course = require('../models/Course');
const Schedule = require('../models/Schedule');
const Incident = require('../models/Incident');
const PassengerFeedback = require('../models/PassengerFeedback');
const Alert = require('../models/Alert');

class AlertService {
  constructor() {
    // Alert types
    this.alertTypes = {
      // Vehicle alerts
      VEHICLE_BREAKDOWN: 'vehicle_breakdown',
      MAINTENANCE_DUE: 'maintenance_due',
      INSURANCE_EXPIRY: 'insurance_expiry',
      ROUTE_DEVIATION: 'route_deviation',
      SPEED_VIOLATION: 'speed_violation',
      
      // Driver alerts
      LICENSE_EXPIRY: 'license_expiry',
      PSV_EXPIRY: 'psv_expiry',
      MEDICAL_EXPIRY: 'medical_expiry',
      
      // Safety alerts
      SAFETY_INCIDENT: 'safety_incident',
      COMPLIANCE_BREACH: 'compliance_breach',
      
      // Operational alerts
      ROUTE_DELAY: 'route_delay',
      SCHEDULE_CONFLICT: 'schedule_conflict',
      CAPACITY_OVERFLOW: 'capacity_overflow',
      
      // Financial alerts
      REVENUE_TARGET_MISSED: 'revenue_target_missed',
      EXPENSE_OVERBUDGET: 'expense_overbudget',
      
      // Service alerts
      SERVICE_QUALITY_LOW: 'service_quality_low',
      CUSTOMER_COMPLAINT: 'customer_complaint'
    };

    // Severity levels
    this.severityLevels = {
      CRITICAL: 'critical',
      HIGH: 'high',
      MEDIUM: 'medium',
      LOW: 'low'
    };
  }

  // ==================== VEHICLE-RELATED ALERTS ====================

  /**
   * Create vehicle-related alerts
   */
  async createVehicleAlerts() {
    const alerts = [];
    
    // Get all vehicles
    const vehicles = await Vehicle.find({ status: { $in: ['in_use', 'available'] } });

    for (const vehicle of vehicles) {
      // Check for breakdowns (mock data)
      if (vehicle.status === 'breakdown') {
        alerts.push(await this.createAlert({
          type: this.alertTypes.VEHICLE_BREAKDOWN,
          severity: this.severityLevels.CRITICAL,
          title: `Vehicle Breakdown: ${vehicle.plateNumber}`,
          message: `Vehicle ${vehicle.plateNumber} has broken down and is out of service`,
          entityId: vehicle._id,
          entityType: 'vehicle',
          metadata: {
            plateNumber: vehicle.plateNumber,
            breakdownDate: new Date(),
            estimatedRepairTime: '2-3 days'
          }
        }));
      }

      // Check maintenance due
      const lastMaintenance = vehicle.lastMaintenanceDate || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const daysSinceMaintenance = Math.floor((Date.now() - lastMaintenance.getTime()) / (24 * 60 * 60 * 1000));
      
      if (daysSinceMaintenance > 60) { // Maintenance due after 60 days
        alerts.push(await this.createAlert({
          type: this.alertTypes.MAINTENANCE_DUE,
          severity: daysSinceMaintenance > 90 ? this.severityLevels.HIGH : this.severityLevels.MEDIUM,
          title: `Maintenance Due: ${vehicle.plateNumber}`,
          message: `Vehicle ${vehicle.plateNumber} is due for maintenance (${daysSinceMaintenance} days since last maintenance)`,
          entityId: vehicle._id,
          entityType: 'vehicle',
          metadata: {
            plateNumber: vehicle.plateNumber,
            daysSinceMaintenance,
            lastMaintenanceDate: lastMaintenance
          }
        }));
      }

      // Check insurance expiry
      const insuranceExpiry = vehicle.insuranceExpiryDate;
      if (insuranceExpiry) {
        const daysToExpiry = Math.floor((insuranceExpiry.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
        
        if (daysToExpiry <= 30) {
          alerts.push(await this.createAlert({
            type: this.alertTypes.INSURANCE_EXPIRY,
            severity: daysToExpiry <= 7 ? this.severityLevels.CRITICAL : this.severityLevels.HIGH,
            title: `Insurance Expiry: ${vehicle.plateNumber}`,
            message: `Vehicle ${vehicle.plateNumber} insurance expires in ${daysToExpiry} days`,
            entityId: vehicle._id,
            entityType: 'vehicle',
            metadata: {
              plateNumber: vehicle.plateNumber,
              daysToExpiry,
              expiryDate: insuranceExpiry
            }
          }));
        }
      }

      // Check route deviation
      const routeDeviation = await this.checkRouteDeviation(vehicle);
      if (routeDeviation) {
        alerts.push(routeDeviation);
      }

      // Check speed violations
      if (vehicle.currentSpeed && vehicle.currentSpeed > 80) { // Speed limit 80 km/h
        alerts.push(await this.createAlert({
          type: this.alertTypes.SPEED_VIOLATION,
          severity: vehicle.currentSpeed > 100 ? this.severityLevels.HIGH : this.severityLevels.MEDIUM,
          title: `Speed Violation: ${vehicle.plateNumber}`,
          message: `Vehicle ${vehicle.plateNumber} is traveling at ${vehicle.currentSpeed} km/h (limit: 80 km/h)`,
          entityId: vehicle._id,
          entityType: 'vehicle',
          metadata: {
            plateNumber: vehicle.plateNumber,
            currentSpeed: vehicle.currentSpeed,
            speedLimit: 80,
            location: vehicle.currentLocation
          }
        }));
      }
    }

    return alerts;
  }

  // ==================== DRIVER-RELATED ALERTS ====================

  /**
   * Create driver-related alerts
   */
  async createDriverAlerts() {
    const alerts = [];
    
    // Get all active drivers
    const drivers = await Driver.find({ status: 'active' });

    for (const driver of drivers) {
      // Check license expiry
      const licenseExpiry = driver.licenseExpiryDate;
      if (licenseExpiry) {
        const daysToExpiry = Math.floor((licenseExpiry.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
        
        if (daysToExpiry <= 30) {
          alerts.push(await this.createAlert({
            type: this.alertTypes.LICENSE_EXPIRY,
            severity: daysToExpiry <= 7 ? this.severityLevels.CRITICAL : this.severityLevels.HIGH,
            title: `License Expiry: ${driver.name}`,
            message: `Driver ${driver.name}'s license expires in ${daysToExpiry} days`,
            entityId: driver._id,
            entityType: 'driver',
            metadata: {
              driverName: driver.name,
              licenseNumber: driver.licenseNumber,
              daysToExpiry,
              expiryDate: licenseExpiry
            }
          }));
        }
      }

      // Check PSV expiry
      const psvExpiry = driver.psvExpiryDate;
      if (psvExpiry) {
        const daysToExpiry = Math.floor((psvExpiry.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
        
        if (daysToExpiry <= 30) {
          alerts.push(await this.createAlert({
            type: this.alertTypes.PSV_EXPIRY,
            severity: daysToExpiry <= 7 ? this.severityLevels.CRITICAL : this.severityLevels.HIGH,
            title: `PSV Expiry: ${driver.name}`,
            message: `Driver ${driver.name}'s PSV license expires in ${daysToExpiry} days`,
            entityId: driver._id,
            entityType: 'driver',
            metadata: {
              driverName: driver.name,
              psvNumber: driver.psvNumber,
              daysToExpiry,
              expiryDate: psvExpiry
            }
          }));
        }
      }

      // Check medical certificate expiry
      const medicalExpiry = driver.medicalExpiryDate;
      if (medicalExpiry) {
        const daysToExpiry = Math.floor((medicalExpiry.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
        
        if (daysToExpiry <= 30) {
          alerts.push(await this.createAlert({
            type: this.alertTypes.MEDICAL_EXPIRY,
            severity: daysToExpiry <= 7 ? this.severityLevels.CRITICAL : this.severityLevels.HIGH,
            title: `Medical Certificate Expiry: ${driver.name}`,
            message: `Driver ${driver.name}'s medical certificate expires in ${daysToExpiry} days`,
            entityId: driver._id,
            entityType: 'driver',
            metadata: {
              driverName: driver.name,
              daysToExpiry,
              expiryDate: medicalExpiry
            }
          }));
        }
      }
    }

    return alerts;
  }

  // ==================== SAFETY AND COMPLIANCE ALERTS ====================

  /**
   * Create safety and compliance alerts
   */
  async createSafetyAlerts() {
    const alerts = [];
    
    // Check for recent incidents
    const recentIncidents = await Incident.find({
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
    });

    for (const incident of recentIncidents) {
      alerts.push(await this.createAlert({
        type: this.alertTypes.SAFETY_INCIDENT,
        severity: incident.severity === 'major' ? this.severityLevels.CRITICAL : this.severityLevels.HIGH,
        title: `Safety Incident: ${incident.title}`,
        message: incident.description,
        entityId: incident._id,
        entityType: 'incident',
        metadata: {
          incidentType: incident.type,
          severity: incident.severity,
          location: incident.location,
          date: incident.incidentDate
        }
      }));
    }

    // Check compliance breaches
    const complianceBreaches = await this.checkComplianceBreaches();
    alerts.push(...complianceBreaches);

    return alerts;
  }

  // ==================== OPERATIONAL ALERTS ====================

  /**
   * Create operational alerts
   */
  async createOperationalAlerts() {
    const alerts = [];
    
    // Check route delays
    const routeDelays = await this.checkRouteDelays();
    alerts.push(...routeDelays);

    // Check schedule conflicts
    const scheduleConflicts = await this.checkScheduleConflicts();
    alerts.push(...scheduleConflicts);

    // Check capacity overflow
    const capacityOverflow = await this.checkCapacityOverflow();
    alerts.push(...capacityOverflow);

    return alerts;
  }

  // ==================== FINANCIAL ALERTS ====================

  /**
   * Create financial alerts
   */
  async createFinancialAlerts() {
    const alerts = [];
    
    // Check revenue targets
    const revenueAlerts = await this.checkRevenueTargets();
    alerts.push(...revenueAlerts);

    // Check expense overruns
    const expenseAlerts = await this.checkExpenseOverruns();
    alerts.push(...expenseAlerts);

    return alerts;
  }

  // ==================== CUSTOMER SERVICE ALERTS ====================

  /**
   * Create customer service alerts
   */
  async createCustomerServiceAlerts() {
    const alerts = [];
    
    // Check for customer complaints
    const recentComplaints = await PassengerFeedback.find({
      rating: { $lt: 3 },
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
    });

    if (recentComplaints.length > 0) {
      alerts.push(await this.createAlert({
        type: this.alertTypes.CUSTOMER_COMPLAINT,
        severity: this.severityLevels.MEDIUM,
        title: 'Customer Complaints Alert',
        message: `${recentComplaints.length} customer complaints received in the last 24 hours`,
        entityType: 'service',
        metadata: {
          complaintCount: recentComplaints.length,
          averageRating: recentComplaints.reduce((sum, c) => sum + c.rating, 0) / recentComplaints.length,
          timePeriod: '24 hours'
        }
      }));
    }

    // Check service quality
    const lowQualityAlerts = await this.checkServiceQuality();
    alerts.push(...lowQualityAlerts);

    return alerts;
  }

  // ==================== HELPER METHODS ====================

  /**
   * Create an alert and save to database
   */
  async createAlert(alertData) {
    try {
      // Check if similar alert already exists (to avoid duplicates)
      const existingAlert = await Alert.findOne({
        type: alertData.type,
        entityId: alertData.entityId,
        entityType: alertData.entityType,
        status: 'active',
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
      });

      if (existingAlert) {
        return existingAlert;
      }

      const alert = new Alert(alertData);
      await alert.save();
      return alert;
    } catch (error) {
      console.error('Error creating alert:', error);
      return null;
    }
  }

  /**
   * Check route deviation
   */
  async checkRouteDeviation(vehicle) {
    // Mock route deviation check
    if (vehicle.currentLocation && vehicle.assignedRoute) {
      const route = await Course.findById(vehicle.assignedRoute);
      if (route) {
        // Simple distance check (in real implementation, you'd use proper geospatial queries)
        const deviationThreshold = 2; // 2km
        const distanceFromRoute = Math.random() * 5; // Mock distance calculation
        
        if (distanceFromRoute > deviationThreshold) {
          return await this.createAlert({
            type: this.alertTypes.ROUTE_DEVIATION,
            severity: this.severityLevels.MEDIUM,
            title: `Route Deviation: ${vehicle.plateNumber}`,
            message: `Vehicle ${vehicle.plateNumber} has deviated from its assigned route`,
            entityId: vehicle._id,
            entityType: 'vehicle',
            metadata: {
              plateNumber: vehicle.plateNumber,
              routeName: route.name,
              deviationDistance: distanceFromRoute,
              currentLocation: vehicle.currentLocation
            }
          });
        }
      }
    }
    return null;
  }

  /**
   * Check compliance breaches
   */
  async checkComplianceBreaches() {
    const alerts = [];
    
    // Mock compliance checks
    const complianceIssues = [
      {
        type: 'overcrowding',
        severity: this.severityLevels.HIGH,
        title: 'Vehicle Overcrowding Detected',
        message: 'Vehicle is operating beyond seating capacity',
        entityType: 'vehicle'
      }
    ];

    for (const issue of complianceIssues) {
      alerts.push(await this.createAlert(issue));
    }

    return alerts;
  }

  /**
   * Check route delays
   */
  async checkRouteDelays() {
    const alerts = [];
    
    // Mock route delay check
    const schedules = await Schedule.find({ status: 'active' });
    
    for (const schedule of schedules) {
      const delayThreshold = 15; // 15 minutes
      const actualDelay = Math.random() * 30; // Mock delay calculation
      
      if (actualDelay > delayThreshold) {
        alerts.push(await this.createAlert({
          type: this.alertTypes.ROUTE_DELAY,
          severity: actualDelay > 30 ? this.severityLevels.HIGH : this.severityLevels.MEDIUM,
          title: `Route Delay: ${schedule.routeName}`,
          message: `Route ${schedule.routeName} is delayed by ${Math.round(actualDelay)} minutes`,
          entityId: schedule._id,
          entityType: 'system',
          metadata: {
            routeName: schedule.routeName,
            delayMinutes: Math.round(actualDelay),
            scheduledTime: schedule.departureTime,
            actualTime: new Date(Date.now() + actualDelay * 60 * 1000)
          }
        }));
      }
    }

    return alerts;
  }

  /**
   * Check schedule conflicts
   */
  async checkScheduleConflicts() {
    const alerts = [];
    
    // Mock schedule conflict check
    const conflicts = [
      {
        type: this.alertTypes.SCHEDULE_CONFLICT,
        severity: this.severityLevels.MEDIUM,
        title: 'Schedule Conflict Detected',
        message: 'Multiple vehicles assigned to same route at same time',
        entityType: 'system',
        metadata: {
          routeName: 'Route A',
          conflictTime: new Date(),
          affectedVehicles: ['Vehicle 1', 'Vehicle 2']
        }
      }
    ];

    for (const conflict of conflicts) {
      alerts.push(await this.createAlert(conflict));
    }

    return alerts;
  }

  /**
   * Check capacity overflow
   */
  async checkCapacityOverflow() {
    const alerts = [];
    
    const vehicles = await Vehicle.find({ status: { $in: ['in_use', 'available'] } });
    
    for (const vehicle of vehicles) {
      const capacity = vehicle.seatingCapacity || 30;
      const currentPassengers = vehicle.totalPassengersFerried || 0;
      const utilizationRate = currentPassengers / capacity;
      
      if (utilizationRate > 1.2) { // 120% capacity
        alerts.push(await this.createAlert({
          type: this.alertTypes.CAPACITY_OVERFLOW,
          severity: this.severityLevels.HIGH,
          title: `Capacity Overflow: ${vehicle.plateNumber}`,
          message: `Vehicle ${vehicle.plateNumber} is operating at ${(utilizationRate * 100).toFixed(1)}% capacity`,
          entityId: vehicle._id,
          entityType: 'vehicle',
          metadata: {
            plateNumber: vehicle.plateNumber,
            capacity: vehicle.seatingCapacity,
            currentPassengers: vehicle.totalPassengersFerried,
            utilizationRate: utilizationRate
          }
        }));
      }
    }

    return alerts;
  }

  /**
   * Check revenue targets
   */
  async checkRevenueTargets() {
    const alerts = [];
    
    // Mock revenue target check
    const monthlyRevenue = 45000; // Mock data
    const targetRevenue = 50000;
    const achievementRate = (monthlyRevenue / targetRevenue) * 100;

    if (achievementRate < 90) { // Less than 90% of target
      alerts.push(await this.createAlert({
        type: this.alertTypes.REVENUE_TARGET_MISSED,
        severity: this.severityLevels.MEDIUM,
        title: 'Revenue Target Missed',
        message: `Monthly revenue is ${achievementRate.toFixed(1)}% of target (KES ${monthlyRevenue.toLocaleString()} vs KES ${targetRevenue.toLocaleString()})`,
        entityType: 'financial',
        metadata: {
          targetRevenue,
          actualRevenue: monthlyRevenue,
          achievementRate,
          shortfall: targetRevenue - monthlyRevenue
        }
      }));
    }

    return alerts;
  }

  /**
   * Check expense overruns
   */
  async checkExpenseOverruns() {
    const alerts = [];
    
    // Mock expense check
    const monthlyExpenses = 42000; // Mock data
    const budgetedExpenses = 40000;
    const overrunPercentage = ((monthlyExpenses - budgetedExpenses) / budgetedExpenses) * 100;

    if (overrunPercentage > 10) { // More than 10% over budget
      alerts.push(await this.createAlert({
        type: this.alertTypes.EXPENSE_OVERBUDGET,
        severity: this.severityLevels.MEDIUM,
        title: 'Expense Overrun Alert',
        message: `Monthly expenses are ${overrunPercentage.toFixed(1)}% over budget (KES ${monthlyExpenses.toLocaleString()} vs KES ${budgetedExpenses.toLocaleString()})`,
        entityType: 'financial',
        metadata: {
          budgetedExpenses,
          actualExpenses: monthlyExpenses,
          overrunPercentage,
          overrunAmount: monthlyExpenses - budgetedExpenses
        }
      }));
    }

    return alerts;
  }

  /**
   * Check service quality
   */
  async checkServiceQuality() {
    const alerts = [];
    
    // Check average passenger satisfaction
    const recentFeedback = await PassengerFeedback.find({
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
    });

    if (recentFeedback.length > 0) {
      const averageRating = recentFeedback.reduce((sum, feedback) => sum + feedback.ratings.overall, 0) / recentFeedback.length;
      
      if (averageRating < 3.5) { // Below 3.5 stars
        alerts.push(await this.createAlert({
          type: this.alertTypes.SERVICE_QUALITY_LOW,
          severity: this.severityLevels.MEDIUM,
          title: 'Low Service Quality Alert',
          message: `Average passenger satisfaction is ${averageRating.toFixed(1)}/5 stars`,
          entityType: 'service',
          metadata: {
            averageRating,
            feedbackCount: recentFeedback.length,
            timePeriod: '7 days'
          }
        }));
      }
    }

    return alerts;
  }

  // ==================== MAIN ALERT GENERATION METHOD ====================

  /**
   * Generate all alerts
   */
  async generateAllAlerts() {
    console.log('🚨 Generating alerts...');

    const allAlerts = [];

    // Generate different types of alerts
    const vehicleAlerts = await this.createVehicleAlerts();
    const driverAlerts = await this.createDriverAlerts();
    const safetyAlerts = await this.createSafetyAlerts();
    const operationalAlerts = await this.createOperationalAlerts();
    const financialAlerts = await this.createFinancialAlerts();
    const customerServiceAlerts = await this.createCustomerServiceAlerts();

    // Combine all alerts
    allAlerts.push(
      ...vehicleAlerts,
      ...driverAlerts,
      ...safetyAlerts,
      ...operationalAlerts,
      ...financialAlerts,
      ...customerServiceAlerts
    );

    console.log(`✅ Generated ${allAlerts.length} alerts`);

    return allAlerts;
  }

  // ==================== API METHODS ====================

  /**
   * Get alerts by type
   */
  async getAlertsByType(type) {
    return await Alert.getAlertsByFilters({ type });
  }

  /**
   * Get alerts by severity
   */
  async getAlertsBySeverity(severity) {
    return await Alert.getAlertsByFilters({ severity });
  }

  /**
   * Get active alerts
   */
  async getActiveAlerts() {
    return await Alert.getAlertsByFilters({ status: 'active' });
  }

  /**
   * Get alerts with pagination and filters
   */
  async getAlerts(filters = {}, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    
    const query = {};
    if (filters.status) query.status = filters.status;
    if (filters.type) query.type = filters.type;
    if (filters.severity) query.severity = filters.severity;
    if (filters.entityType) query.entityType = filters.entityType;
    
    const alerts = await Alert.find(query)
      .populate('entityId', 'name plateNumber licenseNumber')
      .populate('acknowledgedBy', 'name email')
      .populate('resolvedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await Alert.countDocuments(query);
    
    return {
      alerts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId, acknowledgedBy) {
    try {
      const alert = await Alert.findById(alertId);
      if (!alert) {
        throw new Error('Alert not found');
      }

      alert.acknowledged = true;
      alert.acknowledgedBy = acknowledgedBy;
      alert.acknowledgedAt = new Date();
      alert.status = 'acknowledged';
      
      await alert.save();
      
      return alert;
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      throw error;
    }
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(alertId, resolvedBy) {
    try {
      const alert = await Alert.findById(alertId);
      if (!alert) {
        throw new Error('Alert not found');
      }

      alert.resolvedBy = resolvedBy;
      alert.resolvedAt = new Date();
      alert.status = 'resolved';
      
      await alert.save();
      
      return alert;
    } catch (error) {
      console.error('Error resolving alert:', error);
      throw error;
    }
  }

  /**
   * Get alert statistics
   */
  async getAlertStatistics(timeRange = '24h') {
    try {
      const stats = await Alert.getAlertStatistics(timeRange);
      
      if (stats.length === 0) {
        return {
          total: 0,
          bySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
          byType: {},
          byEntityType: { vehicle: 0, driver: 0, incident: 0, system: 0, financial: 0, service: 0 },
          byStatus: { active: 0, acknowledged: 0, resolved: 0, dismissed: 0 }
        };
      }

      const result = stats[0];
      
      // Process severity data
      const bySeverity = { critical: 0, high: 0, medium: 0, low: 0 };
      result.bySeverity.forEach(item => {
        bySeverity[item.severity] = item.count;
      });

      // Process type data
      const byType = {};
      result.byType.forEach(item => {
        byType[item.type] = item.count;
      });

      // Process entity type data
      const byEntityType = { vehicle: 0, driver: 0, incident: 0, system: 0, financial: 0, service: 0 };
      result.byEntityType.forEach(item => {
        byEntityType[item.entityType] = item.count;
      });

      // Process status data
      const byStatus = { active: 0, acknowledged: 0, resolved: 0, dismissed: 0 };
      result.byStatus.forEach(item => {
        byStatus[item.status] = item.count;
      });

      return {
        total: result.total,
        bySeverity,
        byType,
        byEntityType,
        byStatus
      };
    } catch (error) {
      console.error('Error getting alert statistics:', error);
      throw error;
    }
  }
}

module.exports = new AlertService(); 
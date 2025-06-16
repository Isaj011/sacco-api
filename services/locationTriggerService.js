const LocationTrigger = require('../models/LocationTrigger');
const VehicleLocationHistory = require('../models/VehicleLocationHistory');
const Vehicle = require('../models/Vehicle');
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');

class LocationTriggerService {
  // Check if a trigger should be activated
  static async checkTrigger(vehicleId, currentLocation, context = {}) {
    // Get all active triggers for the vehicle
    const triggers = await LocationTrigger.find({
      vehicle: vehicleId,
      isActive: true
    });

    const activatedTriggers = [];
    const historyEntries = [];

    // Evaluate each trigger
    for (const trigger of triggers) {
      const shouldTrigger = await this.evaluateTrigger(trigger, currentLocation, context);
      
      if (shouldTrigger) {
        activatedTriggers.push(trigger);
        
        // Create history entry for this trigger
        const historyEntry = await this.createHistoryEntry(trigger, currentLocation, context);
        historyEntries.push(historyEntry);
        
        // Update trigger's last triggered timestamp
        trigger.lastTriggered = new Date();
        await trigger.save();
      }
    }

    // Update vehicle's current location
    await this.updateVehicleLocation(vehicleId, currentLocation, context);

    return {
      activatedTriggers,
      historyEntries
    };
  }

  // Create a history entry
  static async createHistoryEntry(trigger, location, context) {
    const historyData = {
      vehicleId: trigger.vehicle,
      location: {
        latitude: location.latitude,
        longitude: location.longitude
      },
      speed: {
        current: context.currentSpeed,
        average: context.averageSpeed,
        max: context.maxSpeed
      },
      heading: context.heading,
      context: {
        triggerType: trigger.type,
        triggerId: trigger._id,
        events: context.events || [],
        conditions: {
          weather: context.weather,
          traffic: context.traffic
        },
        performance: context.performance,
        route: context.route
      },
      metadata: {
        source: context.source || 'system',
        accuracy: context.accuracy,
        batteryLevel: context.batteryLevel,
        signalStrength: context.signalStrength
      }
    };

    return await VehicleLocationHistory.create(historyData);
  }

  // Update vehicle's current location
  static async updateVehicleLocation(vehicleId, location, context) {
    const updateData = {
      currentLocation: {
        latitude: location.latitude,
        longitude: location.longitude,
        updatedAt: new Date()
      }
    };

    // Add additional vehicle data if available
    if (context.speed) {
      updateData.currentSpeed = context.currentSpeed;
    }
    if (context.heading) {
      updateData.heading = context.heading;
    }
    if (context.status) {
      updateData.status = context.status;
    }

    await Vehicle.findByIdAndUpdate(vehicleId, updateData);
  }

  // Evaluate if a trigger should be activated
  static async evaluateTrigger(trigger, currentLocation, context) {
    switch (trigger.type) {
      case 'time_based':
        return this.evaluateTimeBasedTrigger(trigger, context);
      case 'location_based':
        return this.evaluateLocationBasedTrigger(trigger, currentLocation, context);
      case 'speed_based':
        return this.evaluateSpeedBasedTrigger(trigger, context);
      case 'event_based':
        return this.evaluateEventBasedTrigger(trigger, context);
      case 'condition_based':
        return this.evaluateConditionBasedTrigger(trigger, context);
      case 'route_deviation':
        return this.evaluateRouteDeviationTrigger(trigger, currentLocation, context);
      case 'performance_based':
        return this.evaluatePerformanceBasedTrigger(trigger, context);
      case 'integration_based':
        return this.evaluateIntegrationBasedTrigger(trigger, context);
      default:
        return false;
    }
  }

  // Time-based trigger evaluation
  static evaluateTimeBasedTrigger(trigger, context) {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = `${currentHour}:${currentMinute}`;

    const { timeWindows } = trigger.conditions.timeBased;
    
    // Check if current time falls within any time window
    for (const [windowType, window] of Object.entries(timeWindows)) {
      if (currentTime >= window.start && currentTime <= window.end) {
        // Check if enough time has passed since last trigger
        const lastTriggered = trigger.lastTriggered || new Date(0);
        const timeSinceLastTrigger = (now - lastTriggered) / 1000 / 60; // in minutes
        return timeSinceLastTrigger >= window.updateInterval;
      }
    }

    return false;
  }

  // Location-based trigger evaluation
  static evaluateLocationBasedTrigger(trigger, currentLocation, context) {
    const { geofence, distance } = trigger.conditions.locationBased;

    if (geofence) {
      // Check if vehicle is within geofence
      const isInGeofence = this.checkGeofence(geofence, currentLocation);
      if (isInGeofence) {
        return true;
      }
    }

    if (distance) {
      // Check if vehicle has moved more than threshold distance
      const lastLocation = context.lastLocation;
      if (lastLocation) {
        const distanceMoved = this.calculateDistance(lastLocation, currentLocation);
        return distanceMoved >= distance.threshold;
      }
    }

    return false;
  }

  // Speed-based trigger evaluation
  static evaluateSpeedBasedTrigger(trigger, context) {
    const { thresholds, change } = trigger.conditions.speedBased;
    const currentSpeed = context.currentSpeed;
    const lastSpeed = context.lastSpeed;

    if (currentSpeed >= thresholds.high || currentSpeed <= thresholds.low) {
      return true;
    }

    if (lastSpeed && change) {
      const speedChange = Math.abs(currentSpeed - lastSpeed) / lastSpeed * 100;
      return speedChange >= change.percentage;
    }

    return false;
  }

  // Event-based trigger evaluation
  static evaluateEventBasedTrigger(trigger, context) {
    const { events } = trigger.conditions.eventBased;
    return Object.entries(events).some(([event, shouldTrigger]) => 
      shouldTrigger && context.events && context.events.includes(event)
    );
  }

  // Condition-based trigger evaluation
  static evaluateConditionBasedTrigger(trigger, context) {
    const { weather, traffic, vehicle } = trigger.conditions.conditionBased;
    
    return (
      (weather && this.checkWeatherConditions(weather, context.weather)) ||
      (traffic && this.checkTrafficConditions(traffic, context.traffic)) ||
      (vehicle && this.checkVehicleConditions(vehicle, context.vehicle))
    );
  }

  // Route deviation trigger evaluation
  static evaluateRouteDeviationTrigger(trigger, currentLocation, context) {
    const { distance, allowedDeviation } = trigger.conditions.routeDeviation;
    const route = context.route;

    if (!route) return false;

    const distanceFromRoute = this.calculateDistanceFromRoute(currentLocation, route);
    return distanceFromRoute > distance.fromRoute;
  }

  // Performance-based trigger evaluation
  static evaluatePerformanceBasedTrigger(trigger, context) {
    const { metrics, thresholds } = trigger.conditions.performanceBased;
    
    return Object.entries(metrics).some(([metric, shouldCheck]) => {
      if (!shouldCheck) return false;
      
      const value = context.performance[metric];
      const threshold = thresholds[metric];
      
      return value >= threshold;
    });
  }

  // Integration-based trigger evaluation
  static evaluateIntegrationBasedTrigger(trigger, context) {
    const { systems, updateFrequency } = trigger.conditions.integrationBased;
    
    return Object.entries(systems).some(([system, isEnabled]) => {
      if (!isEnabled) return false;
      
      const lastUpdate = context.lastUpdates[system];
      if (!lastUpdate) return true;
      
      const timeSinceLastUpdate = (Date.now() - lastUpdate) / 1000;
      return timeSinceLastUpdate >= updateFrequency[system];
    });
  }

  // Helper methods
  static checkGeofence(geofence, location) {
    // Implement geofence checking logic
    return true; // Placeholder
  }

  static calculateDistance(location1, location2) {
    // Haversine formula implementation
    const R = 6371e3; // Earth's radius in meters
    const φ1 = location1.latitude * Math.PI/180;
    const φ2 = location2.latitude * Math.PI/180;
    const Δφ = (location2.latitude - location1.latitude) * Math.PI/180;
    const Δλ = (location2.longitude - location1.longitude) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
  }

  static calculateDistanceFromRoute(location, route) {
    // Implement distance from route calculation
    return 0; // Placeholder
  }

  static checkWeatherConditions(conditions, weather) {
    // Implement weather condition checking
    return true; // Placeholder
  }

  static checkTrafficConditions(conditions, traffic) {
    // Implement traffic condition checking
    return true; // Placeholder
  }

  static checkVehicleConditions(conditions, vehicle) {
    // Implement vehicle condition checking
    return true; // Placeholder
  }

  static calculateSpeed(distance, time) {
    return (distance / time) * 3.6; // Convert m/s to km/h
  }

  static calculateHeading(location1, location2) {
    const φ1 = location1.latitude * Math.PI/180;
    const φ2 = location2.latitude * Math.PI/180;
    const λ1 = location1.longitude * Math.PI/180;
    const λ2 = location2.longitude * Math.PI/180;

    const y = Math.sin(λ2 - λ1) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) -
              Math.sin(φ1) * Math.cos(φ2) * Math.cos(λ2 - λ1);
    
    return (Math.atan2(y, x) * 180/Math.PI + 360) % 360;
  }
}

module.exports = LocationTriggerService; 
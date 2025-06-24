const LocationTrigger = require('../models/LocationTrigger');
const Vehicle = require('../models/Vehicle');
const Course = require('../models/Course');

// Sample location triggers for testing - compatible with seeder data
const sampleTriggers = [
  {
    name: 'Speed Alert - High Speed',
    type: 'speed_based',
    vehicle: null, // Will be set dynamically
    conditions: {
      speedBased: {
        thresholds: {
          high: 60, // km/h
          low: 5
        },
        change: {
          percentage: 20
        }
      }
    },
    isActive: true,
    metadata: {
      description: 'Triggers when vehicle speed exceeds 60 km/h',
      priority: 'high',
      tags: ['speed', 'safety']
    }
  },
  {
    name: 'Geofence Alert - CBD Entry',
    type: 'location_based',
    vehicle: null,
    conditions: {
      locationBased: {
        geofence: {
          center: { latitude: -1.2921, longitude: 36.8219 }, // Nairobi CBD
          radius: 1000 // meters
        },
        distance: {
          threshold: 500 // meters
        }
      }
    },
    isActive: true,
    metadata: {
      description: 'Triggers when vehicle enters Nairobi CBD area',
      priority: 'medium',
      tags: ['location', 'geofence']
    }
  },
  {
    name: 'Time-based Update',
    type: 'time_based',
    vehicle: null,
    conditions: {
      timeBased: {
        timeWindows: {
          peakHours: {
            start: '07:00',
            end: '09:00',
            updateInterval: 2 // minutes
          },
          offPeak: {
            start: '10:00',
            end: '16:00',
            updateInterval: 5 // minutes
          }
        }
      }
    },
    isActive: true,
    metadata: {
      description: 'Regular location updates during peak and off-peak hours',
      priority: 'low',
      tags: ['time', 'regular']
    }
  },
  {
    name: 'Traffic Alert',
    type: 'condition_based',
    vehicle: null,
    conditions: {
      conditionBased: {
        traffic: {
          heavy: true,
          light: false
        }
      }
    },
    isActive: true,
    metadata: {
      description: 'Triggers during heavy traffic conditions',
      priority: 'medium',
      tags: ['traffic', 'conditions']
    }
  },
  {
    name: 'Route Deviation Alert',
    type: 'route_deviation',
    vehicle: null,
    conditions: {
      routeDeviation: {
        distance: {
          fromRoute: 200, // meters
          timeWindow: 300 // seconds
        },
        allowedDeviation: {
          distance: 100, // meters
          duration: 60 // seconds
        }
      }
    },
    isActive: true,
    metadata: {
      description: 'Triggers when vehicle deviates more than 200m from route',
      priority: 'high',
      tags: ['route', 'deviation']
    }
  },
  {
    name: 'Performance Alert - Low Fuel Efficiency',
    type: 'performance_based',
    vehicle: null,
    conditions: {
      performanceBased: {
        metrics: {
          fuelEfficiency: true,
          speedVariation: false,
          idleTime: true,
          stopDuration: false
        },
        thresholds: {
          fuelEfficiency: 8.0, // km/l
          idleTime: 300 // seconds
        }
      }
    },
    isActive: true,
    metadata: {
      description: 'Triggers when fuel efficiency drops below 8 km/l',
      priority: 'medium',
      tags: ['performance', 'fuel']
    }
  },
  {
    name: 'Event Alert - Trip Start',
    type: 'event_based',
    vehicle: null,
    conditions: {
      eventBased: {
        events: {
          tripStart: true,
          tripEnd: false,
          stopArrival: true,
          stopDeparture: false,
          statusChange: true,
          maintenance: false
        }
      }
    },
    isActive: true,
    metadata: {
      description: 'Triggers on trip start, stop arrival, and status change events',
      priority: 'low',
      tags: ['events', 'trip']
    }
  },
  {
    name: 'Maintenance Alert - High Mileage',
    type: 'performance_based',
    vehicle: null,
    conditions: {
      performanceBased: {
        metrics: {
          fuelEfficiency: false,
          speedVariation: false,
          idleTime: false,
          stopDuration: false
        },
        thresholds: {
          mileage: 50000 // km
        }
      }
    },
    isActive: true,
    metadata: {
      description: 'Triggers when vehicle mileage approaches maintenance threshold',
      priority: 'medium',
      tags: ['maintenance', 'mileage']
    }
  }
];

// Function to create sample triggers for all vehicles
async function createSampleTriggers(createdBy) {
  try {
    // Get all vehicles with their routes
    const vehicles = await Vehicle.find({ 
      status: { $in: ['in_use', 'available'] } 
    }).populate('assignedRoute');
    
    if (vehicles.length === 0) {
      console.log('No vehicles found to create triggers for');
      return;
    }

    const createdTriggers = [];

    // Create triggers for each vehicle
    for (const vehicle of vehicles) {
      for (const triggerTemplate of sampleTriggers) {
        const triggerData = {
          ...triggerTemplate,
          vehicle: vehicle._id,
          createdBy
        };

        // Check if trigger already exists for this vehicle and type
        const existingTrigger = await LocationTrigger.findOne({
          vehicle: vehicle._id,
          type: triggerTemplate.type,
          name: triggerTemplate.name
        });

        if (!existingTrigger) {
          const trigger = await LocationTrigger.create(triggerData);
          createdTriggers.push(trigger);
          console.log(`Created trigger "${trigger.name}" for vehicle ${vehicle.plateNumber || vehicle._id}`);
        }
      }

      // Create route-specific triggers if vehicle has assigned route
      if (vehicle.assignedRoute) {
        const routeSpecificTriggers = await createRouteSpecificTriggers(vehicle, createdBy);
        createdTriggers.push(...routeSpecificTriggers);
      }
    }

    console.log(`✅ Created ${createdTriggers.length} sample location triggers`);
    return createdTriggers;

  } catch (error) {
    console.error('Error creating sample triggers:', error);
    throw error;
  }
}

// Create route-specific triggers
async function createRouteSpecificTriggers(vehicle, createdBy) {
  const createdTriggers = [];
  
  try {
    // Get route stops for geofence triggers
    const course = await Course.findById(vehicle.assignedRoute).populate('stops');
    
    if (course && course.stops && course.stops.length > 0) {
      // Create stop arrival triggers for each stop
      for (const stop of course.stops) {
        const stopTrigger = {
          name: `Stop Arrival - ${stop.stopName || stop.stopId}`,
          type: 'location_based',
          vehicle: vehicle._id,
          conditions: {
            locationBased: {
              geofence: {
                center: { 
                  latitude: stop.coordinates?.latitude || -1.2921, 
                  longitude: stop.coordinates?.longitude || 36.8219 
                },
                radius: 200 // meters
              }
            }
          },
          isActive: true,
          metadata: {
            description: `Triggers when vehicle arrives at ${stop.stopName || stop.stopId}`,
            priority: 'medium',
            tags: ['stop', 'arrival', 'route']
          },
          createdBy
        };

        // Check if trigger already exists
        const existingTrigger = await LocationTrigger.findOne({
          vehicle: vehicle._id,
          type: 'location_based',
          name: stopTrigger.name
        });

        if (!existingTrigger) {
          const trigger = await LocationTrigger.create(stopTrigger);
          createdTriggers.push(trigger);
          console.log(`Created stop trigger "${trigger.name}" for vehicle ${vehicle.plateNumber}`);
        }
      }
    }
  } catch (error) {
    console.error('Error creating route-specific triggers:', error);
  }

  return createdTriggers;
}

// Function to clear all sample triggers
async function clearSampleTriggers() {
  try {
    const result = await LocationTrigger.deleteMany({
      name: { $in: sampleTriggers.map(t => t.name) }
    });
    
    console.log(`🗑️ Cleared ${result.deletedCount} sample location triggers`);
    return result.deletedCount;
  } catch (error) {
    console.error('Error clearing sample triggers:', error);
    throw error;
  }
}

// Function to get trigger statistics
async function getTriggerStats() {
  try {
    const stats = await LocationTrigger.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          activeCount: {
            $sum: { $cond: ['$isActive', 1, 0] }
          }
        }
      }
    ]);

    const totalTriggers = await LocationTrigger.countDocuments();
    const activeTriggers = await LocationTrigger.countDocuments({ isActive: true });

    // Get vehicle-specific stats
    const vehicleStats = await LocationTrigger.aggregate([
      {
        $lookup: {
          from: 'vehicles',
          localField: 'vehicle',
          foreignField: '_id',
          as: 'vehicleInfo'
        }
      },
      {
        $unwind: '$vehicleInfo'
      },
      {
        $group: {
          _id: '$vehicleInfo.plateNumber',
          triggerCount: { $sum: 1 },
          activeTriggers: {
            $sum: { $cond: ['$isActive', 1, 0] }
          }
        }
      }
    ]);

    return {
      total: totalTriggers,
      active: activeTriggers,
      byType: stats,
      byVehicle: vehicleStats
    };
  } catch (error) {
    console.error('Error getting trigger stats:', error);
    throw error;
  }
}

// Function to create triggers for specific vehicle
async function createTriggersForVehicle(vehicleId, createdBy) {
  try {
    const vehicle = await Vehicle.findById(vehicleId).populate('assignedRoute');
    
    if (!vehicle) {
      throw new Error('Vehicle not found');
    }

    const createdTriggers = [];

    // Create standard triggers
    for (const triggerTemplate of sampleTriggers) {
      const triggerData = {
        ...triggerTemplate,
        vehicle: vehicle._id,
        createdBy
      };

      const existingTrigger = await LocationTrigger.findOne({
        vehicle: vehicle._id,
        type: triggerTemplate.type,
        name: triggerTemplate.name
      });

      if (!existingTrigger) {
        const trigger = await LocationTrigger.create(triggerData);
        createdTriggers.push(trigger);
      }
    }

    // Create route-specific triggers
    if (vehicle.assignedRoute) {
      const routeTriggers = await createRouteSpecificTriggers(vehicle, createdBy);
      createdTriggers.push(...routeTriggers);
    }

    console.log(`✅ Created ${createdTriggers.length} triggers for vehicle ${vehicle.plateNumber}`);
    return createdTriggers;

  } catch (error) {
    console.error('Error creating triggers for vehicle:', error);
    throw error;
  }
}

module.exports = {
  createSampleTriggers,
  createTriggersForVehicle,
  clearSampleTriggers,
  getTriggerStats,
  sampleTriggers
}; 
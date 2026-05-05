// Hand-authored stop coordinates for Nairobi matatu routes.
// Coordinates are [longitude, latitude] (GeoJSON order).

const ROUTES = [
  {
    routeNumber: 'R001',
    routeName:   'Utawala - CBD',
    routeType:   'fleet',
    totalDistance: 22,
    estimatedDuration: '60',
    stops: [
      { stopName: 'Utawala Estate',         stopOrder: 1,  isTerminal: true,  coordinates: { longitude: 36.9500, latitude: -1.2833 } },
      { stopName: 'Utawala Market',         stopOrder: 2,  isTerminal: false, coordinates: { longitude: 36.9350, latitude: -1.2850 } },
      { stopName: 'Joska Junction',         stopOrder: 3,  isTerminal: false, coordinates: { longitude: 36.9200, latitude: -1.2900 } },
      { stopName: 'Malaa',                  stopOrder: 4,  isTerminal: false, coordinates: { longitude: 36.9050, latitude: -1.2950 } },
      { stopName: 'Kangundo Road Bypass',   stopOrder: 5,  isTerminal: false, coordinates: { longitude: 36.8900, latitude: -1.2980 } },
      { stopName: 'Outering Road Junction', stopOrder: 6,  isTerminal: false, coordinates: { longitude: 36.8700, latitude: -1.2950 } },
      { stopName: 'Harambee Estate',        stopOrder: 7,  isTerminal: false, coordinates: { longitude: 36.8550, latitude: -1.2900 } },
      { stopName: 'Fire Station',           stopOrder: 8,  isTerminal: false, coordinates: { longitude: 36.8450, latitude: -1.2870 } },
      { stopName: 'Railway Station',        stopOrder: 9,  isTerminal: false, coordinates: { longitude: 36.8350, latitude: -1.2833 } },
      { stopName: 'CBD (Kencom)',            stopOrder: 10, isTerminal: true,  coordinates: { longitude: 36.8219, latitude: -1.2921 } },
    ],
  },
  {
    routeNumber: 'R002',
    routeName:   'Syokimau - CBD',
    routeType:   'fleet',
    totalDistance: 18,
    estimatedDuration: '45',
    stops: [
      { stopName: 'Syokimau Estate',   stopOrder: 1, isTerminal: true,  coordinates: { longitude: 36.8900, latitude: -1.3500 } },
      { stopName: 'Syokimau Market',   stopOrder: 2, isTerminal: false, coordinates: { longitude: 36.8800, latitude: -1.3400 } },
      { stopName: 'JKIA Roundabout',   stopOrder: 3, isTerminal: false, coordinates: { longitude: 36.8750, latitude: -1.3200 } },
      { stopName: 'Cabanas',           stopOrder: 4, isTerminal: false, coordinates: { longitude: 36.8650, latitude: -1.3100 } },
      { stopName: 'Expressway Toll',   stopOrder: 5, isTerminal: false, coordinates: { longitude: 36.8600, latitude: -1.3000 } },
      { stopName: 'South B',           stopOrder: 6, isTerminal: false, coordinates: { longitude: 36.8500, latitude: -1.2950 } },
      { stopName: 'Nyayo Stadium',     stopOrder: 7, isTerminal: false, coordinates: { longitude: 36.8400, latitude: -1.2980 } },
      { stopName: 'Globe Roundabout',  stopOrder: 8, isTerminal: false, coordinates: { longitude: 36.8300, latitude: -1.2950 } },
      { stopName: 'CBD (Archives)',    stopOrder: 9, isTerminal: true,  coordinates: { longitude: 36.8219, latitude: -1.2921 } },
    ],
  },
]

module.exports = ROUTES

// Hand-authored stop coordinates for Nairobi matatu routes.
// Coordinates are [longitude, latitude] (GeoJSON order).
// estimatedTime = minutes from route start (ISO 8601 duration string)

const ROUTES = [
  {
    routeNumber: 'R001',
    routeName:   'Utawala - CBD',
    routeType:   'fleet',
    totalDistance: 22,
    estimatedDuration: '60',
    stops: [
      { stopId: 'R001-S01', stopName: 'Utawala Estate',         stopOrder: 1,  isTerminal: true,  estimatedTime: 'PT0M',  coordinates: { longitude: 36.9500, latitude: -1.2833 } },
      { stopId: 'R001-S02', stopName: 'Utawala Market',         stopOrder: 2,  isTerminal: false, estimatedTime: 'PT5M',  coordinates: { longitude: 36.9350, latitude: -1.2850 } },
      { stopId: 'R001-S03', stopName: 'Joska Junction',         stopOrder: 3,  isTerminal: false, estimatedTime: 'PT12M', coordinates: { longitude: 36.9200, latitude: -1.2900 } },
      { stopId: 'R001-S04', stopName: 'Malaa',                  stopOrder: 4,  isTerminal: false, estimatedTime: 'PT20M', coordinates: { longitude: 36.9050, latitude: -1.2950 } },
      { stopId: 'R001-S05', stopName: 'Kangundo Road Bypass',   stopOrder: 5,  isTerminal: false, estimatedTime: 'PT28M', coordinates: { longitude: 36.8900, latitude: -1.2980 } },
      { stopId: 'R001-S06', stopName: 'Outering Road Junction', stopOrder: 6,  isTerminal: false, estimatedTime: 'PT36M', coordinates: { longitude: 36.8700, latitude: -1.2950 } },
      { stopId: 'R001-S07', stopName: 'Harambee Estate',        stopOrder: 7,  isTerminal: false, estimatedTime: 'PT44M', coordinates: { longitude: 36.8550, latitude: -1.2900 } },
      { stopId: 'R001-S08', stopName: 'Fire Station',           stopOrder: 8,  isTerminal: false, estimatedTime: 'PT50M', coordinates: { longitude: 36.8450, latitude: -1.2870 } },
      { stopId: 'R001-S09', stopName: 'Railway Station',        stopOrder: 9,  isTerminal: false, estimatedTime: 'PT56M', coordinates: { longitude: 36.8350, latitude: -1.2833 } },
      { stopId: 'R001-S10', stopName: 'CBD (Kencom)',            stopOrder: 10, isTerminal: true,  estimatedTime: 'PT60M', coordinates: { longitude: 36.8219, latitude: -1.2921 } },
    ],
  },
  {
    routeNumber: 'R002',
    routeName:   'Syokimau - CBD',
    routeType:   'fleet',
    totalDistance: 18,
    estimatedDuration: '45',
    stops: [
      { stopId: 'R002-S01', stopName: 'Syokimau Estate',   stopOrder: 1, isTerminal: true,  estimatedTime: 'PT0M',  coordinates: { longitude: 36.8900, latitude: -1.3500 } },
      { stopId: 'R002-S02', stopName: 'Syokimau Market',   stopOrder: 2, isTerminal: false, estimatedTime: 'PT5M',  coordinates: { longitude: 36.8800, latitude: -1.3400 } },
      { stopId: 'R002-S03', stopName: 'JKIA Roundabout',   stopOrder: 3, isTerminal: false, estimatedTime: 'PT12M', coordinates: { longitude: 36.8750, latitude: -1.3200 } },
      { stopId: 'R002-S04', stopName: 'Cabanas',           stopOrder: 4, isTerminal: false, estimatedTime: 'PT18M', coordinates: { longitude: 36.8650, latitude: -1.3100 } },
      { stopId: 'R002-S05', stopName: 'Expressway Toll',   stopOrder: 5, isTerminal: false, estimatedTime: 'PT24M', coordinates: { longitude: 36.8600, latitude: -1.3000 } },
      { stopId: 'R002-S06', stopName: 'South B',           stopOrder: 6, isTerminal: false, estimatedTime: 'PT30M', coordinates: { longitude: 36.8500, latitude: -1.2950 } },
      { stopId: 'R002-S07', stopName: 'Nyayo Stadium',     stopOrder: 7, isTerminal: false, estimatedTime: 'PT36M', coordinates: { longitude: 36.8400, latitude: -1.2980 } },
      { stopId: 'R002-S08', stopName: 'Globe Roundabout',  stopOrder: 8, isTerminal: false, estimatedTime: 'PT40M', coordinates: { longitude: 36.8300, latitude: -1.2950 } },
      { stopId: 'R002-S09', stopName: 'CBD (Archives)',    stopOrder: 9, isTerminal: true,  estimatedTime: 'PT45M', coordinates: { longitude: 36.8219, latitude: -1.2921 } },
    ],
  },
]

module.exports = ROUTES

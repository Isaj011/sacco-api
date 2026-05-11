// Hand-authored stop coordinates for Nairobi matatu routes.
// Coordinates are [longitude, latitude] (GeoJSON order).
// estimatedTime = minutes from route start (ISO 8601 duration string)

const ROUTES = [
  {
    // Rerouted: Utawala south via Eastern Bypass → Imara Daima → Mombasa Road → CBD
    routeNumber: 'R001',
    routeName:   'Utawala - CBD',
    routeType:   'fleet',
    totalDistance: 25,
    estimatedDuration: '65',
    stops: [
      { stopId: 'R001-S01', stopName: 'Utawala Estate',       stopOrder: 1, isTerminal: true,  estimatedTime: 'PT0M',  coordinates: { longitude: 36.9500, latitude: -1.2833 } },
      { stopId: 'R001-S02', stopName: 'Utawala Market',       stopOrder: 2, isTerminal: false, estimatedTime: 'PT6M',  coordinates: { longitude: 36.9420, latitude: -1.2910 } },
      { stopId: 'R001-S03', stopName: 'Eastern Bypass Jn',    stopOrder: 3, isTerminal: false, estimatedTime: 'PT15M', coordinates: { longitude: 36.9130, latitude: -1.3080 } },
      { stopId: 'R001-S04', stopName: 'Imara Daima',          stopOrder: 4, isTerminal: false, estimatedTime: 'PT26M', coordinates: { longitude: 36.8930, latitude: -1.3200 } },
      { stopId: 'R001-S05', stopName: 'Mombasa Rd (SGR)',     stopOrder: 5, isTerminal: false, estimatedTime: 'PT34M', coordinates: { longitude: 36.8700, latitude: -1.3185 } },
      { stopId: 'R001-S06', stopName: 'South C',              stopOrder: 6, isTerminal: false, estimatedTime: 'PT43M', coordinates: { longitude: 36.8480, latitude: -1.3085 } },
      { stopId: 'R001-S07', stopName: 'Nyayo Stadium',        stopOrder: 7, isTerminal: false, estimatedTime: 'PT51M', coordinates: { longitude: 36.8330, latitude: -1.3020 } },
      { stopId: 'R001-S08', stopName: 'Globe Roundabout',     stopOrder: 8, isTerminal: false, estimatedTime: 'PT58M', coordinates: { longitude: 36.8255, latitude: -1.2960 } },
      { stopId: 'R001-S09', stopName: 'CBD (Kencom)',          stopOrder: 9, isTerminal: true,  estimatedTime: 'PT65M', coordinates: { longitude: 36.8219, latitude: -1.2921 } },
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
  {
    // Ruai Bypass → Kangundo Road → Outer Ring → CBD
    routeNumber: 'R003',
    routeName:   'Ruai Bypass - CBD',
    routeType:   'fleet',
    totalDistance: 20,
    estimatedDuration: '55',
    stops: [
      { stopId: 'R003-S01', stopName: 'Ruai Terminus',          stopOrder: 1,  isTerminal: true,  estimatedTime: 'PT0M',  coordinates: { longitude: 36.9380, latitude: -1.2975 } },
      { stopId: 'R003-S02', stopName: 'Joska Junction',         stopOrder: 2,  isTerminal: false, estimatedTime: 'PT7M',  coordinates: { longitude: 36.9200, latitude: -1.2900 } },
      { stopId: 'R003-S03', stopName: 'Malaa',                  stopOrder: 3,  isTerminal: false, estimatedTime: 'PT14M', coordinates: { longitude: 36.9050, latitude: -1.2950 } },
      { stopId: 'R003-S04', stopName: 'Kangundo Rd / Bypass',   stopOrder: 4,  isTerminal: false, estimatedTime: 'PT21M', coordinates: { longitude: 36.8900, latitude: -1.2980 } },
      { stopId: 'R003-S05', stopName: 'Outering Road Junction', stopOrder: 5,  isTerminal: false, estimatedTime: 'PT29M', coordinates: { longitude: 36.8700, latitude: -1.2950 } },
      { stopId: 'R003-S06', stopName: 'Harambee Estate',        stopOrder: 6,  isTerminal: false, estimatedTime: 'PT36M', coordinates: { longitude: 36.8550, latitude: -1.2900 } },
      { stopId: 'R003-S07', stopName: 'Fire Station',           stopOrder: 7,  isTerminal: false, estimatedTime: 'PT42M', coordinates: { longitude: 36.8450, latitude: -1.2870 } },
      { stopId: 'R003-S08', stopName: 'Railway Station',        stopOrder: 8,  isTerminal: false, estimatedTime: 'PT49M', coordinates: { longitude: 36.8350, latitude: -1.2833 } },
      { stopId: 'R003-S09', stopName: 'CBD (Kencom)',            stopOrder: 9,  isTerminal: true,  estimatedTime: 'PT55M', coordinates: { longitude: 36.8219, latitude: -1.2921 } },
    ],
  },
]

module.exports = ROUTES

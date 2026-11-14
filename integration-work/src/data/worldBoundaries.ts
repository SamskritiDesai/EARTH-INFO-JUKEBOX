// World Boundaries, Landmarks, and Preloaded Satellite Routes for EARTH FM

export interface Landmark {
  id: string;
  name: string;
  lat: number;
  lon: number;
  region: string;
  desc: string;
}

export const LANDMARKS: Landmark[] = [
  { id: 'mumbai', name: 'Mumbai, India', lat: 19.0760, lon: 72.8777, region: 'South Asia', desc: 'Arabian Sea monsoon interface & coastal biome' },
  { id: 'amazon', name: 'Amazon Basin, Brazil', lat: -3.4653, lon: -62.2159, region: 'South America', desc: 'Dense tropical rainforest canopy & river basin' },
  { id: 'tokyo', name: 'Tokyo, Japan', lat: 35.6762, lon: 139.6503, region: 'East Asia', desc: 'Kuroshio Current terminus & Pacific coastal zone' },
  { id: 'sahara', name: 'Sahara Desert, Chad', lat: 20.5000, lon: 18.0000, region: 'North Africa', desc: 'Massive mineral dust storm generation epicenter' },
  { id: 'new_york', name: 'New York, USA', lat: 40.7128, lon: -74.0060, region: 'North America', desc: 'North Atlantic coastal shelf & urban biosphere' },
  { id: 'reykjavik', name: 'Reykjavik, Iceland', lat: 64.1466, lon: -21.9426, region: 'North Atlantic', desc: 'Sub-polar marine boundary & volcanic geology' },
  { id: 'barrier_reef', name: 'Great Barrier Reef, Australia', lat: -18.2871, lon: 147.6992, region: 'Oceania', desc: 'Coral Sea marine sanctuary & tropical waters' },
  { id: 'nairobi', name: 'Nairobi, Kenya', lat: -1.2921, lon: 36.8219, region: 'East Africa', desc: 'Great Rift Valley highlands & savanna canopy' },
  { id: 'california', name: 'California Coast, USA', lat: 36.7783, lon: -119.4179, region: 'North America', desc: 'Pacific upwelling zone & coastal redwood forests' },
  { id: 'siberia', name: 'Siberian Taiga, Russia', lat: 60.0000, lon: 105.0000, region: 'North Asia', desc: 'Vast boreal coniferous forest & permafrost basin' },
  { id: 'congo', name: 'Congo Rainforest, DRC', lat: -0.2280, lon: 21.7587, region: 'Central Africa', desc: 'Second largest contiguous tropical rainforest on Earth' },
  { id: 'antarctica', name: 'Ross Ice Shelf, Antarctica', lat: -81.0000, lon: -175.0000, region: 'Polar South', desc: 'Southern Ocean polar vortex & sea salt storm belt' }
];

export interface SatelliteRoutePreset {
  id: string;
  title: string;
  subtitle: string;
  sourceId: string;
  destinationId: string;
  sourceLat: number;
  sourceLon: number;
  destLat: number;
  destLon: number;
  bpm: number;
  description: string;
}

export const DEFAULT_ROUTE_PRESETS: SatelliteRoutePreset[] = [
  {
    id: 'preset-transpacific',
    title: 'TRANS-PACIFIC DRIFT',
    subtitle: 'Tokyo -> California Coast',
    sourceId: 'tokyo',
    destinationId: 'california',
    sourceLat: 35.6762,
    sourceLon: 139.6503,
    destLat: 36.7783,
    destLon: -119.4179,
    bpm: 78,
    description: 'Riding the Kuroshio extension across the North Pacific into the redwood coastal upwelling.'
  },
  {
    id: 'preset-monsoon',
    title: 'INDIAN OCEAN MONSOON',
    subtitle: 'Nairobi -> Mumbai',
    sourceId: 'nairobi',
    destinationId: 'mumbai',
    sourceLat: -1.2921,
    sourceLon: 36.8219,
    destLat: 19.0760,
    destLon: 72.8777,
    bpm: 82,
    description: 'Equatorial East Africa cross-ocean trajectory carrying sea salt and seasonal moisture waves.'
  },
  {
    id: 'preset-canopy-taiga',
    title: 'BOREAL CANOPY EXPEDITION',
    subtitle: 'Reykjavik -> Siberian Taiga',
    sourceId: 'reykjavik',
    destinationId: 'siberia',
    sourceLat: 64.1466,
    sourceLon: -21.9426,
    destLat: 60.0000,
    destLon: 105.0000,
    bpm: 76,
    description: 'High-latitude transit over Arctic seas transitioning into dense evergreen taiga forest height.'
  },
  {
    id: 'preset-dust-belt',
    title: 'SAHARAN AEROSOL HIGHWAY',
    subtitle: 'Sahara Desert -> Amazon Basin',
    sourceId: 'sahara',
    destinationId: 'amazon',
    sourceLat: 20.5000,
    sourceLon: 18.0000,
    destLat: -3.4653,
    destLon: -62.2159,
    bpm: 80,
    description: 'Trans-Atlantic mineral dust conveyor fertilizing the Amazon rainforest canopy with phosphorus.'
  }
];

// Vector polylines for sharp continent coastlines and country outlines
export const COASTLINE_POLYLINES: number[][][] = [
  // North America & Central America
  [
    [-168, 65], [-160, 71], [-140, 70], [-130, 69], [-120, 69], [-100, 70], [-80, 73],
    [-70, 62], [-60, 55], [-65, 45], [-70, 42], [-75, 35], [-80, 30], [-81, 25],
    [-83, 29], [-88, 30], [-95, 29], [-97, 26], [-97, 21], [-90, 19], [-87, 14],
    [-84, 10], [-79, 9], [-77, 8], [-80, 7], [-85, 10], [-90, 14], [-96, 16],
    [-105, 20], [-110, 24], [-115, 30], [-120, 34], [-124, 40], [-125, 48],
    [-130, 54], [-135, 58], [-145, 60], [-155, 58], [-165, 54], [-168, 65]
  ],
  // Greenland
  [
    [-44, 60], [-35, 65], [-20, 72], [-18, 80], [-30, 83], [-50, 82], [-60, 76],
    [-55, 70], [-50, 65], [-44, 60]
  ],
  // South America
  [
    [-77, 8], [-72, 11], [-65, 10], [-55, 6], [-50, 0], [-45, -2], [-36, -6],
    [-35, -10], [-38, -15], [-42, -22], [-48, -28], [-53, -33], [-58, -38],
    [-65, -45], [-68, -53], [-74, -53], [-74, -45], [-72, -35], [-71, -25],
    [-75, -15], [-80, -5], [-80, 2], [-77, 8]
  ],
  // Europe & Scandinavia
  [
    [-9, 36], [-9, 43], [-1, 44], [-2, 48], [-5, 48], [2, 51], [5, 53], [8, 55],
    [10, 58], [8, 62], [13, 65], [16, 69], [25, 71], [30, 70], [28, 65], [22, 60],
    [18, 57], [12, 54], [5, 53], [0, 50], [-1, 46], [-3, 43], [-5, 36], [0, 38],
    [10, 38], [15, 38], [18, 40], [15, 44], [12, 44], [16, 41], [22, 40], [25, 36],
    [27, 41], [30, 46], [35, 47], [37, 45], [36, 42], [28, 41], [24, 38], [22, 38],
    [15, 38], [10, 37], [0, 38], [-5, 36], [-9, 36]
  ],
  // Great Britain & Ireland
  [[-5, 50], [1, 51], [0, 54], [-2, 58], [-5, 58], [-5, 55], [-4, 52], [-5, 50]],
  [[-10, 51], [-6, 52], [-6, 55], [-10, 54], [-10, 51]],
  // Africa
  [
    [-9, 36], [-5, 36], [10, 37], [15, 32], [25, 32], [33, 31], [34, 27], [38, 20],
    [43, 12], [51, 11], [48, 5], [42, -2], [40, -10], [35, -20], [32, -28], [28, -32],
    [20, -34], [18, -34], [15, -28], [12, -18], [12, -8], [9, 2], [3, 5], [-5, 5],
    [-13, 8], [-17, 14], [-17, 21], [-13, 27], [-10, 32], [-9, 36]
  ],
  // Madagascar
  [[44, -13], [50, -14], [48, -25], [44, -25], [44, -13]],
  // Asia & Siberia
  [
    [34, 31], [35, 27], [40, 22], [48, 26], [55, 25], [60, 25], [68, 25], [70, 20],
    [76, 10], [80, 8], [80, 15], [87, 21], [92, 20], [98, 10], [103, 1], [104, 10],
    [108, 15], [108, 21], [115, 22], [120, 26], [121, 31], [122, 38], [127, 38],
    [129, 34], [130, 42], [137, 47], [142, 53], [145, 60], [158, 55], [163, 60],
    [170, 64], [180, 65], [-170, 66], [180, 71], [160, 72], [140, 74], [120, 76],
    [100, 77], [80, 73], [60, 69], [50, 68], [40, 66], [30, 70], [35, 60], [45, 50],
    [50, 45], [48, 40], [36, 42], [35, 36], [34, 31]
  ],
  // Japan
  [[130, 33], [132, 34], [136, 35], [140, 39], [141, 43], [145, 44], [141, 45], [140, 41], [136, 37], [131, 33], [130, 33]],
  // Australia
  [
    [114, -22], [120, -18], [130, -12], [136, -12], [142, -10], [146, -16],
    [153, -28], [150, -36], [144, -38], [138, -35], [130, -32], [120, -34],
    [115, -34], [113, -26], [114, -22]
  ],
  // New Zealand
  [[173, -35], [178, -38], [174, -42], [170, -45], [167, -46], [171, -43], [173, -35]],
  // Antarctica
  [
    [-60, -65], [-55, -70], [-20, -74], [20, -70], [60, -67], [90, -66], [120, -66],
    [150, -68], [170, -72], [-170, -76], [-140, -75], [-100, -73], [-80, -72],
    [-65, -68], [-60, -65]
  ]
];

// Major borders
export const BORDER_POLYLINES: number[][][] = [
  [[-123, 49], [-120, 49], [-110, 49], [-100, 49], [-95, 49]],
  [[-117, 32.5], [-114.7, 32.7], [-108.2, 31.7], [-106.5, 31.7], [-104, 29.5], [-99, 26], [-97, 26]],
  [[74, 36], [78, 35], [82, 30], [88, 27], [92, 28], [97, 28]],
  [[-16, 22], [0, 22], [15, 22], [30, 22]]
];
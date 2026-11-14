// EARTH FM - 360x180 Procedural Earth Telemetry Engine & Scientific Data Lookups

export type ParameterId = 'sst' | 'aerosols' | 'co2' | 'forest';

export interface ParameterMetadata {
  id: ParameterId;
  name: string;
  shortLabel: string;
  svsSource: string;
  instrument: string;
  units: string;
  minVal: number;
  maxVal: number;
  colorSpectrum: string;
  defaultColor: string;
  voiceStyle: string;
  mappingRule: string;
}

export const PARAMETERS: Record<ParameterId, ParameterMetadata> = {
  sst: {
    id: 'sst',
    name: 'Sea Surface Temp & Currents',
    shortLabel: 'SST / FLOW',
    svsSource: 'NASA SVS #3827 / ECCO2 High-Res Ocean',
    instrument: 'AMSR-E & MODIS Sea Surface Telemetry',
    units: '°C & m/s',
    minVal: -2,
    maxVal: 34,
    colorSpectrum: 'Thermal (Deep Blue -> Cyan -> Orange -> Crimson)',
    defaultColor: '#00ccff',
    voiceStyle: 'Deep Liquid Warm Chords (Electric Piano / Wave Chorus)',
    mappingRule: 'SST [°C] & Velocity [m/s] -> Liquid E-Piano voicing & stereo wave chorus'
  },
  aerosols: {
    id: 'aerosols',
    name: 'GEOS Aerosol Optical Depth',
    shortLabel: 'GEOS AEROSOLS',
    svsSource: 'NASA SVS #4655 / GEOS Forward Processing',
    instrument: 'MODIS / VIIRS Multi-angle Spectral AOD',
    units: 'AOD [0.0 - 1.5]',
    minVal: 0.0,
    maxVal: 1.5,
    colorSpectrum: 'Amber (Dust), Smoke Gray (Carbon), Cyan (Sea Salt)',
    defaultColor: '#ffaa00',
    voiceStyle: 'Flowy Chords (Lush Maj9 / Sus2 Weightless Pads)',
    mappingRule: 'Dust/Smoke/Salt density -> Airy Cmaj9 / Fmaj7#11 pad swells & filter envelope'
  },
  co2: {
    id: 'co2',
    name: 'DYAMOND Global Carbon Dioxide',
    shortLabel: 'ATMOSPHERIC CO2',
    svsSource: 'NASA SVS #4866 / DYAMOND Atmosphere Simulation',
    instrument: 'OCO-2 / OCO-3 Satellite Spectrometers',
    units: 'ppm [405 - 435]',
    minVal: 405,
    maxVal: 435,
    colorSpectrum: 'Emerald -> Amber -> Crimson Swirling Waves',
    defaultColor: '#ff3366',
    voiceStyle: 'Soft Warm Sub-Pad (Gentle C2-G2 Low Root-Fifth Drone)',
    mappingRule: 'CO2 ppm concentration -> Warm breathing low-octave sub-pad cutoff & depth'
  },
  forest: {
    id: 'forest',
    name: 'GEDI Forest Canopy Height',
    shortLabel: 'GEDI CANOPY',
    svsSource: 'NASA SVS #5084 / GEDI Space Station Lidar',
    instrument: 'Global Ecosystem Dynamics Investigation Lidar',
    units: 'Meters [0m - 65m]',
    minVal: 0,
    maxVal: 65,
    colorSpectrum: 'Deep Pine Forest -> Lime Green Canopy Height',
    defaultColor: '#00dd55',
    voiceStyle: 'Warm Acoustic Kalimba / Felt Piano Chords (Woody & Soothing)',
    mappingRule: 'Canopy Height [m] -> Soft felt-piano & warm kalimba intervals (Fmaj7, Am7, Csus2)'
  }
};

export type TimelineEpoch = '2020-Q1' | '2021-Q3' | '2022-Q2' | '2023-Q4' | '2024-Q1';

export interface TimelineInfo {
  id: TimelineEpoch;
  label: string;
  season: string;
  missionStatus: string;
  availableParams: Record<ParameterId, boolean>;
  notes: string;
}

export const TIMELINES: Record<TimelineEpoch, TimelineInfo> = {
  '2020-Q1': {
    id: '2020-Q1',
    label: 'EPOCH 2020-Q1',
    season: 'Boreal Winter / Austral Summer',
    missionStatus: 'GEDI Early Orbit Calibration Phase',
    availableParams: {
      sst: true,
      aerosols: true,
      co2: true,
      forest: false // GEDI Forest Height NOT AVAILABLE in 2020-Q1
    },
    notes: 'Pre-operational GEDI lidar calibration. SST, GEOS, and CO2 fully available.'
  },
  '2021-Q3': {
    id: '2021-Q3',
    label: 'EPOCH 2021-Q3',
    season: 'Boreal Summer / Wildfire Peak',
    missionStatus: 'Full Satellite Constellation Online',
    availableParams: {
      sst: true,
      aerosols: true,
      co2: true,
      forest: true
    },
    notes: 'All 4 Earth telemetry systems active. Peak Siberian & California aerosol plumes.'
  },
  '2022-Q2': {
    id: '2022-Q2',
    label: 'EPOCH 2022-Q2',
    season: 'Boreal Spring / Bloom',
    missionStatus: 'GEOS Optical Sensor Maintenance Window',
    availableParams: {
      sst: true,
      aerosols: false, // GEOS Aerosols NOT AVAILABLE in 2022-Q2
      co2: true,
      forest: true
    },
    notes: 'GEOS reprocessing cycle. SST, CO2, and GEDI Canopy active.'
  },
  '2023-Q4': {
    id: '2023-Q4',
    label: 'EPOCH 2023-Q4',
    season: 'Autumn / El Niño Transition',
    missionStatus: 'High-Res Multi-Mission Synthesis',
    availableParams: {
      sst: true,
      aerosols: true,
      co2: true,
      forest: true
    },
    notes: 'Global equatorial warming anomaly, full canopy coverage and CO2 tracking.'
  },
  '2024-Q1': {
    id: '2024-Q1',
    label: 'EPOCH 2024-Q1',
    season: 'Modern Baseline Telemetry',
    missionStatus: 'OCO-3 Spectral Recalibration',
    availableParams: {
      sst: true,
      aerosols: true,
      co2: false, // DYAMOND CO2 NOT AVAILABLE in 2024-Q1
      forest: true
    },
    notes: 'OCO-3 periodic recalibration. SST, Aerosols, and GEDI Forest active.'
  }
};

export interface SampledEarthTelemetry {
  lat: number;
  lon: number;
  nearestRegion: string;
  isWater: boolean;
  sst: {
    tempC: number;
    velocityMs: number;
    uFlow: number;
    vFlow: number;
    normalized: number;
    available: boolean;
  };
  aerosols: {
    dust: number;
    smoke: number;
    seaSalt: number;
    aod: number;
    normalized: number;
    available: boolean;
  };
  co2: {
    ppm: number;
    normalized: number;
    available: boolean;
  };
  forest: {
    heightMeters: number;
    canopyDensity: number;
    normalized: number;
    available: boolean;
  };
}

// 360x180 Float32 Grids (lon: -180..180 -> 0..359, lat: -90..90 -> 0..179)
const WIDTH = 360;
const HEIGHT = 180;

class EarthDataEngine {
  private sstGrid = new Float32Array(WIDTH * HEIGHT);
  private uVelGrid = new Float32Array(WIDTH * HEIGHT);
  private vVelGrid = new Float32Array(WIDTH * HEIGHT);
  private dustGrid = new Float32Array(WIDTH * HEIGHT);
  private smokeGrid = new Float32Array(WIDTH * HEIGHT);
  private seaSaltGrid = new Float32Array(WIDTH * HEIGHT);
  private co2Grid = new Float32Array(WIDTH * HEIGHT);
  private forestGrid = new Float32Array(WIDTH * HEIGHT);
  private landMaskGrid = new Uint8Array(WIDTH * HEIGHT); // 1 = land, 0 = ocean

  private customTextures: Record<string, string> = {};

  constructor() {
    this.generateRealisticGrids();
  }

  private generateRealisticGrids() {
    for (let y = 0; y < HEIGHT; y++) {
      const lat = y - 90; // -90 to +89
      const latRad = (lat * Math.PI) / 180;
      const cosLat = Math.cos(latRad);
      const absLat = Math.abs(lat);

      for (let x = 0; x < WIDTH; x++) {
        const lon = x - 180; // -180 to +179
        const idx = y * WIDTH + x;

        // 1. Approximate Land vs Ocean Mask
        const isLand = this.computeIsLand(lat, lon);
        this.landMaskGrid[idx] = isLand ? 1 : 0;

        // 2. Sea Surface Temperature & Velocity
        if (!isLand) {
          // Ocean SST: peaks around equator (~28-30°C), drops toward poles (~-1.8°C)
          let baseSst = 29.5 * Math.pow(Math.max(0, cosLat), 0.75) - 2.0;

          // Warm Western Boundary Currents (Gulf Stream & Kuroshio)
          if (lat > 25 && lat < 45 && lon > -80 && lon < -50) {
            baseSst += 5.5; // Gulf Stream warming
          }
          if (lat > 20 && lat < 42 && lon > 125 && lon < 155) {
            baseSst += 4.5; // Kuroshio warming
          }
          // Cold California & Humboldt upwelling
          if (lat > 20 && lat < 40 && lon > -130 && lon < -115) {
            baseSst -= 4.0;
          }
          if (lat > -35 && lat < -10 && lon > -85 && lon < -72) {
            baseSst -= 4.5;
          }
          this.sstGrid[idx] = Math.min(34, Math.max(-2, baseSst));

          // Ocean Currents Velocity (m/s) & Flow vectors
          let speed = 0.2 + 0.3 * Math.sin(latRad * 4);
          let u = -0.3; // Tropical Trade Winds westward
          let v = 0.0;

          // Gulf stream fast jet
          if (lat > 28 && lat < 40 && lon > -80 && lon < -60) {
            speed = 1.8 + 0.6 * Math.sin(x * 0.1);
            u = 1.4;
            v = 0.8;
          }
          // Kuroshio fast jet
          if (lat > 24 && lat < 38 && lon > 128 && lon < 148) {
            speed = 1.7 + 0.5 * Math.cos(y * 0.1);
            u = 1.3;
            v = 0.7;
          }
          // Antarctic Circumpolar Current (ACC)
          if (lat < -45 && lat > -65) {
            speed = 1.2 + 0.4 * Math.sin(x * 0.05);
            u = 1.2;
            v = 0.1;
          }
          this.uVelGrid[idx] = u;
          this.vVelGrid[idx] = v;
        } else {
          // Land baseline
          this.sstGrid[idx] = 15.0;
          this.uVelGrid[idx] = 0;
          this.vVelGrid[idx] = 0;
        }

        // 3. GEOS Aerosols (Dust, Smoke, Sea Salt)
        // Saharan Mineral Dust Plume (trans-Atlantic toward Caribbean)
        let dust = 0.02;
        if (lat >= 10 && lat <= 28 && lon >= -18 && lon <= 35) {
          dust = 0.8 + 0.6 * Math.cos(((lat - 19) / 9) * (Math.PI / 2));
        } else if (lat >= 8 && lat <= 24 && lon >= -60 && lon < -18) {
          // Trans-Atlantic transport
          const dist = (-18 - lon) / 42;
          dust = Math.max(0.05, 0.9 * (1 - dist * 0.7));
        } else if (lat >= 25 && lat <= 42 && lon >= 80 && lon <= 110) {
          dust = 0.5; // Gobi / Taklamakan
        }
        this.dustGrid[idx] = dust;

        // Smoke Plumes (Amazon, Central Africa, Boreal Taiga)
        let smoke = 0.03;
        if (lat >= -15 && lat <= 5 && lon >= -72 && lon <= -45) {
          smoke = 0.75 + 0.3 * Math.sin(x * 0.2); // Amazon biomass burning
        } else if (lat >= -12 && lat <= 8 && lon >= 12 && lon <= 35) {
          smoke = 0.65; // Central African savanna fires
        } else if (lat >= 52 && lat <= 66 && lon >= 90 && lon <= 135) {
          smoke = 0.45; // Siberian summer wildfires
        }
        this.smokeGrid[idx] = smoke;

        // Sea Salt Aerosol (High-wind ocean belts, especially Roaring Forties/Fifties)
        let seaSalt = 0.05;
        if (!isLand) {
          if (lat < -40 && lat > -65) {
            seaSalt = 0.7 + 0.3 * Math.sin(x * 0.1); // Southern Ocean storm tracks
          } else if (lat > 45 && lat < 70) {
            seaSalt = 0.5; // North Atlantic / North Pacific storms
          } else {
            seaSalt = 0.25;
          }
        }
        this.seaSaltGrid[idx] = seaSalt;

        // 4. DYAMOND Atmospheric CO2 (ppm)
        // Global background ~418 ppm with Northern Hemisphere continental plumes (up to 432 ppm)
        let baseCo2 = 416.0 + 3.0 * Math.sin(latRad);
        if (isLand) {
          // Industrial & urban corridors
          if (lat > 25 && lat < 45 && lon > 105 && lon < 125) baseCo2 += 9.5; // East Asia
          if (lat > 30 && lat < 50 && lon > -100 && lon < -70) baseCo2 += 7.0; // Eastern US
          if (lat > 40 && lat < 55 && lon > 0 && lon < 25) baseCo2 += 6.5; // Europe
          if (lat > 15 && lat < 30 && lon > 70 && lon < 88) baseCo2 += 6.0; // India
        }
        // Swirling atmospheric wave disturbance
        baseCo2 += 1.8 * Math.sin(lon * 0.05 + lat * 0.08);
        this.co2Grid[idx] = Math.min(435, Math.max(405, baseCo2));

        // 5. GEDI Forest Canopy Height (Meters: 0m to 65m)
        let treeHeight = 0;
        if (isLand) {
          // Tropical Rainforests (Amazon, Congo, Indonesian Archipelago)
          if (lat >= -10 && lat <= 5 && lon >= -75 && lon <= -50) {
            treeHeight = 42 + 15 * Math.sin(x * 0.15) * Math.cos(y * 0.2); // Amazon: 35-57m
          } else if (lat >= -5 && lat <= 5 && lon >= 12 && lon <= 28) {
            treeHeight = 38 + 14 * Math.sin(y * 0.3); // Congo: 35-52m
          } else if (lat >= -8 && lat <= 6 && lon >= 98 && lon <= 125) {
            treeHeight = 44 + 12 * Math.cos(x * 0.2); // Borneo / Sumatra: 40-56m
          }
          // Pacific Northwest Temperate Conifer (Redwoods / Douglas Fir)
          else if (lat >= 40 && lat <= 52 && lon >= -126 && lon <= -120) {
            treeHeight = 52 + 11 * Math.sin(y * 0.4); // 45-63m tallest temperate canopy
          }
          // Boreal Taiga (Siberia, Canada, Scandinavia)
          else if (lat >= 54 && lat <= 68) {
            if ((lon >= -130 && lon <= -70) || (lon >= 15 && lon <= 140)) {
              treeHeight = 16 + 8 * Math.sin(x * 0.1); // 12-24m evergreen taiga
            }
          }
          // Eastern Deciduous (Appalachians, Central Europe, East Asia)
          else if ((lat >= 34 && lat <= 44 && lon >= -84 && lon <= -72) ||
                   (lat >= 45 && lat <= 54 && lon >= 5 && lon <= 25)) {
            treeHeight = 26 + 7 * Math.sin(x * 0.2); // 20-33m mixed hardwood
          }
          // Savanna / Scrubland
          else if (absLat < 35 && treeHeight === 0) {
            treeHeight = Math.max(0, 6 + 4 * Math.sin(x * 0.3));
          }
        }
        this.forestGrid[idx] = Math.max(0, Math.min(65, treeHeight));
      }
    }
  }

  // Fast rough land check based on major continent polygons
  private computeIsLand(lat: number, lon: number): boolean {
    // Antarctica
    if (lat < -62) return true;
    // Greenland
    if (lat > 60 && lat < 84 && lon > -55 && lon < -20) return true;
    // Australia
    if (lat > -39 && lat < -11 && lon > 113 && lon < 154) return true;
    // North America
    if (lat > 15 && lat < 72 && lon > -168 && lon < -52) {
      if (lat > 50 && lon < -140 && lon > -168) return true; // Alaska
      if (lat > 25 && lon > -125 && lon < -65) return true; // Contiguous US
      if (lat > 15 && lat <= 30 && lon > -115 && lon < -85) return true; // Mexico
      if (lat >= 50 && lon > -130 && lon < -60) return true; // Canada
    }
    // South America
    if (lat > -56 && lat < 12 && lon > -82 && lon < -34) {
      if (lon < -34 && lon > -82) return true;
    }
    // Africa
    if (lat > -35 && lat < 37 && lon > -18 && lon < 52) {
      if (lat > 5 || lon > 8 || lat < -5) return true;
    }
    // Europe & Asia
    if (lat > 10 && lat < 75 && lon > -10 && lon < 180) {
      // Mediterranean basin exclusion
      if (lat > 30 && lat < 45 && lon > -5 && lon < 35 && (lat < 36 || (lat < 42 && lon > 12 && lon < 24))) {
        // sea
      } else {
        return true;
      }
    }
    return false;
  }

  // Bilinear interpolation for smooth O(1) sampling without stepping artifacts
  public sample(lat: number, lon: number, epoch: TimelineEpoch = '2023-Q4'): SampledEarthTelemetry {
    // Normalize coordinates
    let normLon = ((lon + 180) % 360 + 360) % 360; // 0..360
    let normLat = Math.min(89.9, Math.max(-90, lat)) + 90; // 0..180

    const x0 = Math.floor(normLon) % WIDTH;
    const x1 = (x0 + 1) % WIDTH;
    const y0 = Math.min(HEIGHT - 1, Math.floor(normLat));
    const y1 = Math.min(HEIGHT - 1, y0 + 1);

    const fx = normLon - Math.floor(normLon);
    const fy = normLat - Math.floor(normLat);

    const bInterp = (grid: Float32Array) => {
      const v00 = grid[y0 * WIDTH + x0];
      const v10 = grid[y0 * WIDTH + x1];
      const v01 = grid[y1 * WIDTH + x0];
      const v11 = grid[y1 * WIDTH + x1];
      const v0 = v00 * (1 - fx) + v10 * fx;
      const v1 = v01 * (1 - fx) + v11 * fx;
      return v0 * (1 - fy) + v1 * fy;
    };

    const isLand = this.landMaskGrid[y0 * WIDTH + x0] === 1;
    const sstVal = bInterp(this.sstGrid);
    const uVal = bInterp(this.uVelGrid);
    const vVal = bInterp(this.vVelGrid);
    const currentVelocity = Math.sqrt(uVal * uVal + vVal * vVal);

    const dust = bInterp(this.dustGrid);
    const smoke = bInterp(this.smokeGrid);
    const salt = bInterp(this.seaSaltGrid);
    const aod = Math.min(1.8, dust + smoke + salt);

    const co2Val = bInterp(this.co2Grid);
    const forestVal = bInterp(this.forestGrid);

    const avail = TIMELINES[epoch].availableParams;

    // Identify nearest major region / ocean
    const nearest = this.resolveNearestLandmark(lat, lon, isLand);

    return {
      lat,
      lon,
      nearestRegion: nearest,
      isWater: !isLand,
      sst: {
        tempC: Number(sstVal.toFixed(1)),
        velocityMs: Number(currentVelocity.toFixed(2)),
        uFlow: Number(uVal.toFixed(2)),
        vFlow: Number(vVal.toFixed(2)),
        normalized: Math.max(0, Math.min(1, (sstVal + 2) / 36)),
        available: avail.sst
      },
      aerosols: {
        dust: Number(dust.toFixed(2)),
        smoke: Number(smoke.toFixed(2)),
        seaSalt: Number(salt.toFixed(2)),
        aod: Number(aod.toFixed(2)),
        normalized: Math.max(0, Math.min(1, aod / 1.5)),
        available: avail.aerosols
      },
      co2: {
        ppm: Number(co2Val.toFixed(1)),
        normalized: Math.max(0, Math.min(1, (co2Val - 405) / 30)),
        available: avail.co2
      },
      forest: {
        heightMeters: Number(forestVal.toFixed(1)),
        canopyDensity: Number((forestVal / 65).toFixed(2)),
        normalized: Math.max(0, Math.min(1, forestVal / 65)),
        available: avail.forest
      }
    };
  }

  private resolveNearestLandmark(lat: number, lon: number, isLand: boolean): string {
    if (!isLand) {
      if (lat > 65) return 'Arctic Ocean / Polar Drift';
      if (lat < -55) return 'Southern Ocean / Antarctic Belt';
      if (lon > -80 && lon < 0 && lat > 0) return 'North Atlantic Ocean';
      if (lon > -70 && lon < 20 && lat <= 0) return 'South Atlantic Ocean';
      if ((lon < -80 || lon > 120) && lat > 0) return 'North Pacific Ocean';
      if ((lon < -70 || lon > 140) && lat <= 0) return 'South Pacific Ocean';
      if (lon >= 40 && lon <= 110 && lat < 25) return 'Indian Ocean Basin';
      return 'Global Pelagic Ocean';
    }
    // Land
    if (lat > 18 && lat < 30 && lon > 68 && lon < 90) return 'India / Indo-Gangetic Basin';
    if (lat > -20 && lat < 5 && lon > -75 && lon < -45) return 'Amazon Basin / Brazilian Rainforest';
    if (lat > 15 && lat < 32 && lon > -15 && lon < 35) return 'Sahara Desert Mineral Plume';
    if (lat > 30 && lat < 45 && lon > 130 && lon < 145) return 'Japan Archipelago & Kuroshio';
    if (lat > 32 && lat < 42 && lon > -124 && lon < -114) return 'California Coastal Upwelling & Redwoods';
    if (lat > 55 && lat < 70 && lon > 60 && lon < 140) return 'Siberian Taiga & Conifer Shield';
    if (lat > -5 && lat < 6 && lon > 12 && lon < 30) return 'Congo Rainforest Basin';
    if (lat > 42 && lat < 58 && lon > -5 && lon < 25) return 'Western & Central European Corridor';
    if (lat > 22 && lat < 42 && lon > 105 && lon < 125) return 'Eastern China Corridor';
    if (lat < -10 && lat > -40 && lon > 115 && lon < 155) return 'Australian Continental Shield';
    if (lat > 60 && lon > -25 && lon < -12) return 'Icelandic Marine Sub-Arctic';
    return 'Continental Land Mass';
  }

  // Pre-generate dynamic textures for 3D Globe Equirectangular Shading
  public getEquirectangularCanvas(param: ParameterId): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    const imgData = ctx.createImageData(WIDTH, HEIGHT);
    const data = imgData.data;

    for (let y = 0; y < HEIGHT; y++) {
      for (let x = 0; x < WIDTH; x++) {
        const idx = y * WIDTH + x;
        const pIdx = idx * 4;

        if (param === 'sst') {
          const isLand = this.landMaskGrid[idx] === 1;
          if (isLand) {
            data[pIdx] = 10;
            data[pIdx + 1] = 16;
            data[pIdx + 2] = 30;
            data[pIdx + 3] = 230; // Dark slate land
          } else {
            const sst = this.sstGrid[idx];
            const norm = Math.max(0, Math.min(1, (sst + 2) / 36));
            // Thermal Blue -> Cyan -> Orange -> Red
            if (norm < 0.3) {
              data[pIdx] = 0;
              data[pIdx + 1] = Math.floor(norm * 3.3 * 180);
              data[pIdx + 2] = 255;
            } else if (norm < 0.6) {
              data[pIdx] = 0;
              data[pIdx + 1] = 230;
              data[pIdx + 2] = Math.floor((1 - (norm - 0.3) * 3.3) * 255);
            } else if (norm < 0.85) {
              data[pIdx] = 255;
              data[pIdx + 1] = Math.floor(180 - (norm - 0.6) * 4 * 100);
              data[pIdx + 2] = 0;
            } else {
              data[pIdx] = 255;
              data[pIdx + 1] = 30;
              data[pIdx + 2] = 50;
            }
            data[pIdx + 3] = 210;
          }
        } else if (param === 'aerosols') {
          const dust = this.dustGrid[idx];
          const smoke = this.smokeGrid[idx];
          const salt = this.seaSaltGrid[idx];
          const aod = dust + smoke + salt;

          if (aod > 0.15) {
            // Blend amber (dust), violet-gray (smoke), cyan (salt)
            const r = Math.min(255, Math.floor(dust * 240 + smoke * 160));
            const g = Math.min(255, Math.floor(dust * 140 + smoke * 140 + salt * 200));
            const b = Math.min(255, Math.floor(salt * 240 + smoke * 200));
            data[pIdx] = r;
            data[pIdx + 1] = g;
            data[pIdx + 2] = b;
            data[pIdx + 3] = Math.min(240, Math.floor(aod * 180));
          } else {
            data[pIdx + 3] = 0; // transparent
          }
        } else if (param === 'co2') {
          const ppm = this.co2Grid[idx];
          const norm = Math.max(0, Math.min(1, (ppm - 405) / 30));
          // Swirling emerald green -> yellow-amber -> magenta/crimson
          const r = Math.floor(norm * 255);
          const g = Math.floor(Math.sin(norm * Math.PI) * 220);
          const b = Math.floor((1 - norm) * 120 + norm * 80);
          data[pIdx] = r;
          data[pIdx + 1] = g;
          data[pIdx + 2] = b;
          data[pIdx + 3] = Math.floor(130 + norm * 90);
        } else if (param === 'forest') {
          const height = this.forestGrid[idx];
          if (height > 2) {
            const norm = Math.min(1, height / 65);
            // Deep moss pine -> vibrant lime neon canopy
            data[pIdx] = Math.floor(norm * 60);
            data[pIdx + 1] = Math.floor(110 + norm * 145);
            data[pIdx + 2] = Math.floor(40 + norm * 80);
            data[pIdx + 3] = Math.min(240, Math.floor(140 + norm * 100));
          } else {
            data[pIdx + 3] = 0;
          }
        }
      }
    }
    ctx.putImageData(imgData, 0, 0);
    return canvas;
  }
}

export const earthDataEngine = new EarthDataEngine();

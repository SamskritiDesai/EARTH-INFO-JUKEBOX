// UniversalForestLoader.ts
// Adaptive 2D/3D Forest Dataset Engine for TERRA-SCAN
// Seamlessly handles 2D raster/grid images and 3D volumetric voxel arrays

import { CanopyColumnData, DatasetMode, StratumData } from '../types/forest';

export interface VoxelGrid3D {
  width: number; // lon points (e.g. 180)
  height: number; // lat points (e.g. 90)
  depth: number; // 8 vertical strata (0 to 60m)
  // Float32Array of size width * height * depth storing leaf area density [0.0 - 1.0]
  densityData: Float32Array;
  // Float32Array of size width * height storing ground elevation in meters
  elevationData: Float32Array;
}

const STRATA_BOUNDS = [
  { minAlt: 0, maxAlt: 7.5, name: 'Ground & Understory', category: 'UNDERSTORY' as const },
  { minAlt: 7.5, maxAlt: 15.0, name: 'Understory / Sapling', category: 'UNDERSTORY' as const },
  { minAlt: 15.0, maxAlt: 22.5, name: 'Lower Mid-Canopy', category: 'MID_CANOPY' as const },
  { minAlt: 22.5, maxAlt: 30.0, name: 'Mid-Canopy Trunk', category: 'MID_CANOPY' as const },
  { minAlt: 30.0, maxAlt: 37.5, name: 'Upper Mid-Canopy', category: 'MID_CANOPY' as const },
  { minAlt: 37.5, maxAlt: 45.0, name: 'Lower Emergent Crown', category: 'EMERGENT_CROWN' as const },
  { minAlt: 45.0, maxAlt: 52.5, name: 'Emergent Crown', category: 'EMERGENT_CROWN' as const },
  { minAlt: 52.5, maxAlt: 60.0, name: 'Super-Emergent Spire', category: 'EMERGENT_CROWN' as const },
];

export class UniversalForestLoader {
  private mode: DatasetMode = '2D_SURFACE';
  private canvas2D: HTMLCanvasElement;
  private ctx2D: CanvasRenderingContext2D;
  private width2D: number = 360;
  private height2D: number = 180;
  private imageData2D: ImageData | null = null;

  // 3D Volumetric Voxel Storage
  private voxelGrid: VoxelGrid3D;
  private activeZGateMeters: number = 30.0; // 0 to 60m

  // Listeners
  private onDataUpdatedCallbacks: (() => void)[] = [];

  constructor() {
    // 1. Initialize Offscreen 2D Canvas
    this.canvas2D = document.createElement('canvas');
    this.canvas2D.width = this.width2D;
    this.canvas2D.height = this.height2D;
    const ctx = this.canvas2D.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Could not get 2D rendering context');
    this.ctx2D = ctx;

    // 2. Initialize 3D Voxel Grid (180x90x8 for high performance procedural sampling)
    const vw = 180;
    const vh = 90;
    const vd = 8;
    this.voxelGrid = {
      width: vw,
      height: vh,
      depth: vd,
      densityData: new Float32Array(vw * vh * vd),
      elevationData: new Float32Array(vw * vh),
    };

    // 3. Generate initial built-in datasets
    this.generateBuiltin2DMap();
    this.generateBuiltin3DVoxels();
  }

  public getMode(): DatasetMode {
    return this.mode;
  }

  public setMode(mode: DatasetMode) {
    this.mode = mode;
    this.notifyDataUpdated();
  }

  public getCanvas2D(): HTMLCanvasElement {
    return this.canvas2D;
  }

  public getActiveZGate(): number {
    return this.activeZGateMeters;
  }

  public setActiveZGate(meters: number) {
    this.activeZGateMeters = Math.max(0, Math.min(60, meters));
    this.notifyDataUpdated();
  }

  public onDataUpdated(callback: () => void) {
    this.onDataUpdatedCallbacks.push(callback);
  }

  private notifyDataUpdated() {
    this.onDataUpdatedCallbacks.forEach((cb) => cb());
  }

  // =========================================================================
  // BUILT-IN PROCEDURAL 2D FOREST MAP GENERATOR (NASA GEDI STYLE)
  // =========================================================================
  private generateBuiltin2DMap() {
    const w = this.width2D;
    const h = this.height2D;
    const imgData = this.ctx2D.createImageData(w, h);
    const data = imgData.data;

    // Base background: Ocean (0 height, dark cobalt blue)
    for (let y = 0; y < h; y++) {
      const lat = 90 - (y / h) * 180; // 90 to -90
      for (let x = 0; x < w; x++) {
        const lon = (x / w) * 360 - 180; // -180 to 180
        const index = (y * w + x) * 4;

        // Check landmask and forest biome
        const { heightMeters, isLand } = this.calculateForestHeightAtCoordinate(lat, lon);

        if (!isLand) {
          // Ocean: dark navy blue
          data[index] = 4;
          data[index + 1] = 16;
          data[index + 2] = 48;
          data[index + 3] = 255;
        } else {
          // Land: map height (0 - 65m) to Rainbow Thermal Elevation Spectrum:
          // 0m = low shrub (dark blue/purple) -> 15m cyan -> 30m green -> 45m yellow -> 60m+ red
          const rgb = this.heightToThermalRGB(heightMeters);
          data[index] = rgb.r;
          data[index + 1] = rgb.g;
          data[index + 2] = rgb.b;
          data[index + 3] = 255;
        }
      }
    }

    this.ctx2D.putImageData(imgData, 0, 0);
    this.imageData2D = imgData;
  }

  // =========================================================================
  // BUILT-IN PROCEDURAL 3D VOXEL GRID GENERATOR
  // =========================================================================
  private generateBuiltin3DVoxels() {
    const { width, height, depth, densityData, elevationData } = this.voxelGrid;

    for (let y = 0; y < height; y++) {
      const lat = 90 - (y / height) * 180;
      for (let x = 0; x < width; x++) {
        const lon = (x / width) * 360 - 180;
        const colIdx = y * width + x;

        const { heightMeters, isLand, biome } = this.calculateForestHeightAtCoordinate(lat, lon);
        elevationData[colIdx] = isLand ? (heightMeters > 0 ? 120 : 50) : 0;

        if (!isLand || heightMeters <= 0.5) {
          // Zero density for water / bare ground
          for (let z = 0; z < depth; z++) {
            densityData[colIdx * depth + z] = 0;
          }
        } else {
          // Synthesize authentic 8-layer multi-strata density based on biome & height
          const strataProfiles = this.synthesizeVerticalStrata(heightMeters, biome, lat);
          for (let z = 0; z < depth; z++) {
            densityData[colIdx * depth + z] = strataProfiles[z].density;
          }
        }
      }
    }
  }

  // =========================================================================
  // ALLOMETRIC & GEOGRAPHIC BIOME CALCULATOR
  // =========================================================================
  public calculateForestHeightAtCoordinate(
    lat: number,
    lon: number
  ): { heightMeters: number; isLand: boolean; biome: string } {
    // 1. Broad landmass detection check
    const isLand = this.isCoordinateLand(lat, lon);
    if (!isLand) {
      return { heightMeters: 0, isLand: false, biome: 'Marine Ocean' };
    }

    // 2. Identify major forest biomes by coordinate clusters
    // Amazon Basin (-12 to 5 Lat, -75 to -48 Lon)
    if (lat >= -14 && lat <= 6 && lon >= -76 && lon <= -45) {
      const distFromCenter = Math.hypot((lat - -3) / 8, (lon - -62) / 14);
      const h = Math.max(0, 56 - distFromCenter * 16 + this.pseudoNoise(lat * 3, lon * 3) * 8);
      return { heightMeters: Math.min(62, h), isLand: true, biome: 'Amazon Tropical Moist Forest' };
    }

    // Congo Basin (-6 to 6 Lat, 10 to 32 Lon)
    if (lat >= -7 && lat <= 7 && lon >= 10 && lon <= 32) {
      const distFromCenter = Math.hypot((lat - 0) / 7, (lon - 22) / 11);
      const h = Math.max(0, 52 - distFromCenter * 14 + this.pseudoNoise(lat * 3, lon * 3) * 7);
      return { heightMeters: Math.min(58, h), isLand: true, biome: 'Congo Basin Dense Rainforest' };
    }

    // Southeast Asia / Borneo / Sumatra / Papua (lat -10 to 10, lon 95 to 150)
    if (lat >= -11 && lat <= 12 && lon >= 95 && lon <= 152) {
      const h = 50 + this.pseudoNoise(lat * 2.5, lon * 2.5) * 12;
      return { heightMeters: Math.min(64, h), isLand: true, biome: 'Indonesian Dipterocarp Rainforest' };
    }

    // Pacific Northwest & Northern California (lat 40 to 54, lon -128 to -118)
    if (lat >= 40 && lat <= 54 && lon >= -128 && lon <= -118) {
      const h = 52 + this.pseudoNoise(lat * 4, lon * 4) * 14; // Tall Redwoods & Douglas Fir
      return { heightMeters: Math.min(65, h), isLand: true, biome: 'Pacific Northwest Temperate Rainforest' };
    }

    // Boreal Taiga (Canada/Alaska: 50 to 65 lat, -145 to -60 lon)
    if (lat >= 50 && lat <= 66 && lon >= -145 && lon <= -60) {
      const h = 22 + this.pseudoNoise(lat * 2, lon * 2) * 10 - Math.max(0, (lat - 58) * 1.5);
      return { heightMeters: Math.max(4, h), isLand: true, biome: 'North American Boreal Taiga' };
    }

    // Boreal Taiga (Siberia & Scandinavia: 52 to 68 lat, 10 to 140 lon)
    if (lat >= 52 && lat <= 68 && lon >= 10 && lon <= 140) {
      const h = 24 + this.pseudoNoise(lat * 2, lon * 2) * 9 - Math.max(0, (lat - 60) * 1.6);
      return { heightMeters: Math.max(5, h), isLand: true, biome: 'Eurasian Boreal Forest' };
    }

    // Eastern US Deciduous (lat 30 to 45, lon -95 to -70)
    if (lat >= 30 && lat <= 45 && lon >= -95 && lon <= -70) {
      const h = 32 + this.pseudoNoise(lat * 3, lon * 3) * 8;
      return { heightMeters: Math.min(42, h), isLand: true, biome: 'Eastern Deciduous Forest' };
    }

    // Central & Western Europe (lat 42 to 56, lon -5 to 30)
    if (lat >= 42 && lat <= 56 && lon >= -5 && lon <= 30) {
      const h = 28 + this.pseudoNoise(lat * 3, lon * 3) * 7;
      return { heightMeters: Math.min(36, h), isLand: true, biome: 'European Mixed Broadleaf' };
    }

    // Valdivian Temperate Rainforest (Chile: -46 to -37 lat, -75 to -70 lon)
    if (lat >= -46 && lat <= -37 && lon >= -75 && lon <= -70) {
      const h = 42 + this.pseudoNoise(lat * 4, lon * 4) * 8;
      return { heightMeters: Math.min(50, h), isLand: true, biome: 'Valdivian Temperate Rainforest' };
    }

    // Daintree Rainforest (Australia: -19 to -14 lat, 143 to 147 lon)
    if (lat >= -19 && lat <= -14 && lon >= 143 && lon <= 147) {
      return { heightMeters: 44, isLand: true, biome: 'Daintree Tropical Rainforest' };
    }

    // Default land: Savanna / Shrubland / Woodland based on latitude
    if (Math.abs(lat) < 30) {
      const h = Math.max(2, 14 + this.pseudoNoise(lat * 3, lon * 3) * 8);
      return { heightMeters: h, isLand: true, biome: 'Subtropical Woodland / Savanna' };
    } else if (Math.abs(lat) < 55) {
      const h = Math.max(3, 18 + this.pseudoNoise(lat * 3, lon * 3) * 9);
      return { heightMeters: h, isLand: true, biome: 'Temperate Shrub & Woodland' };
    } else if (Math.abs(lat) <= 72) {
      const h = Math.max(1, 10 + this.pseudoNoise(lat * 3, lon * 3) * 5);
      return { heightMeters: h, isLand: true, biome: 'Sub-Arctic Dwarf Shrub' };
    } else {
      return { heightMeters: 0, isLand: true, biome: 'Polar Tundra / Ice Sheet' };
    }
  }

  // Simplified polygonal bounding tests for landmasses
  private isCoordinateLand(lat: number, lon: number): boolean {
    // Antarctica
    if (lat < -60) return true;
    // Greenland
    if (lat > 60 && lon > -55 && lon < -15) return true;
    // North America (approx bounding box)
    if (lat >= 15 && lat <= 72 && lon >= -168 && lon <= -52) {
      // Exclude Gulf of Mexico
      if (lat >= 20 && lat <= 29 && lon >= -94 && lon <= -84) return false;
      return true;
    }
    // South America
    if (lat >= -56 && lat <= 13 && lon >= -82 && lon <= -34) return true;
    // Europe & Asia (Eurasia)
    if (lat >= 35 && lat <= 75 && lon >= -10 && lon <= 180) {
      // Exclude Mediterranean Sea roughly
      if (lat >= 32 && lat <= 43 && lon >= 0 && lon <= 30) return false;
      return true;
    }
    // Africa
    if (lat >= -35 && lat <= 37 && lon >= -18 && lon <= 52) return true;
    // Australia & New Zealand
    if (lat >= -45 && lat <= -10 && lon >= 110 && lon <= 178) return true;
    // Indonesia & Japan islands
    if (lat >= -11 && lat <= 46 && lon >= 95 && lon <= 146) return true;

    return false;
  }

  private pseudoNoise(x: number, y: number): number {
    const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    return (s - Math.floor(s)) * 2 - 1; // -1 to 1
  }

  // Converts Canopy Height (0 to 65m) to Rainbow Thermal RGB
  public heightToThermalRGB(meters: number): { r: number; g: number; b: number } {
    const t = Math.max(0, Math.min(1, meters / 60)); // normalized 0 to 1
    // Rainbow palette: Blue (0.0) -> Cyan (0.25) -> Green (0.5) -> Yellow (0.75) -> Red (1.0)
    let r = 0;
    let g = 0;
    let b = 0;

    if (t < 0.25) {
      const seg = t / 0.25;
      r = 0;
      g = Math.round(seg * 255);
      b = 255;
    } else if (t < 0.5) {
      const seg = (t - 0.25) / 0.25;
      r = 0;
      g = 255;
      b = Math.round((1 - seg) * 255);
    } else if (t < 0.75) {
      const seg = (t - 0.5) / 0.25;
      r = Math.round(seg * 255);
      g = 255;
      b = 0;
    } else {
      const seg = (t - 0.75) / 0.25;
      r = 255;
      g = Math.round((1 - seg) * 255);
      b = 0;
    }

    return { r, g, b };
  }

  // =========================================================================
  // UNIFIED COLUMN DATA QUERY (AT ANY LAT/LON/ALT_Z)
  // =========================================================================
  public sampleCanopyColumn(lat: number, lon: number): CanopyColumnData {
    if (this.mode === '3D_VOLUMETRIC') {
      return this.sampleVolumetric3D(lat, lon);
    } else {
      return this.sampleSurface2D(lat, lon);
    }
  }

  // 1. 2D Surface Mode Sampling
  private sampleSurface2D(lat: number, lon: number): CanopyColumnData {
    // Coordinate mapping to offscreen canvas
    // Lon [-180, 180] -> [0, width-1]
    // Lat [90, -90] -> [0, height-1]
    const u = ((lon + 180) % 360 + 360) % 360 / 360;
    const v = (90 - lat) / 180;

    const px = Math.min(this.width2D - 1, Math.max(0, Math.floor(u * this.width2D)));
    const py = Math.min(this.height2D - 1, Math.max(0, Math.floor(v * this.height2D)));

    let heightMeters = 0;
    let isLand = true;

    if (this.imageData2D) {
      const idx = (py * this.width2D + px) * 4;
      const r = this.imageData2D.data[idx];
      const g = this.imageData2D.data[idx + 1];
      const b = this.imageData2D.data[idx + 2];

      // Detect water (dark blue / low luminance)
      if (b > 40 && r < 20 && g < 30) {
        heightMeters = 0;
        isLand = false;
      } else {
        // Luminance / Rainbow thermal inversion to height:
        // Invert thermal spectrum: Red is high (60m), Yellow is 45m, Green is 30m, Cyan is 15m, Blue is low
        const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
        if (r > 180 && g < 100) {
          // Red range (45 - 60m)
          heightMeters = 45 + ((255 - g) / 255) * 15;
        } else if (r > 150 && g > 150) {
          // Yellow range (35 - 45m)
          heightMeters = 35 + (r / 255) * 10;
        } else if (g > 150 && b < 100) {
          // Green range (20 - 35m)
          heightMeters = 20 + (g / 255) * 15;
        } else {
          heightMeters = (luminance / 255) * 25;
        }
      }
    } else {
      const calc = this.calculateForestHeightAtCoordinate(lat, lon);
      heightMeters = calc.heightMeters;
      isLand = calc.isLand;
    }

    const { biome } = this.calculateForestHeightAtCoordinate(lat, lon);
    const strata = this.synthesizeVerticalStrata(heightMeters, biome, lat);

    // Compute ratios
    const understoryDensity = (strata[0].density + strata[1].density) / 2;
    const midCanopyDensity = (strata[2].density + strata[3].density + strata[4].density) / 3;
    const emergentDensity = (strata[5].density + strata[6].density + strata[7].density) / 3;
    const totalDensity = Math.max(0.001, understoryDensity + midCanopyDensity + emergentDensity);

    // Foliage Height Diversity (Shannon Index H')
    let fhd = 0;
    const sumLAD = strata.reduce((acc, s) => acc + s.density, 0) || 1;
    for (const s of strata) {
      const p = s.density / sumLAD;
      if (p > 0.0001) {
        fhd -= p * Math.log(p);
      }
    }

    // Plant Area Index (PAI)
    const pai = (heightMeters / 60) * 7.5 * (totalDensity / 1.5);

    // Active Z Gate density
    const zGateIdx = Math.min(7, Math.max(0, Math.floor(this.activeZGateMeters / 7.5)));
    const activeZDensity = strata[zGateIdx]?.density || 0;

    const params5 = this.calculate5Parameters(lat, lon, isLand, heightMeters);

    return {
      lat,
      lon,
      maxCanopyHeight: heightMeters,
      airQualityIndex: params5.airQualityIndex,
      aerosolOpticalDepth: params5.aerosolOpticalDepth,
      oceanCurrentSpeed: params5.oceanCurrentSpeed,
      seaSurfaceTempC: params5.seaSurfaceTempC,
      co2Ppm: params5.co2Ppm,
      groundElevation: isLand ? 150 : 0,
      totalCoverPercent: isLand ? Math.min(100, Math.round((heightMeters / 50) * 95)) : 0,
      strata,
      understoryRatio: understoryDensity / totalDensity,
      midCanopyRatio: midCanopyDensity / totalDensity,
      emergentRatio: emergentDensity / totalDensity,
      foliageHeightDiversity: Number(fhd.toFixed(2)),
      plantAreaIndex: Number(pai.toFixed(2)),
      biomeName: isLand ? biome : 'Open Ocean / Sea Surface',
      sourceType: '2D Raster Interpolated',
      activeZGate: this.activeZGateMeters,
      activeZDensity,
    };
  }

  // 2. 3D Volumetric Mode Sampling (Voxel Array Native)
  private sampleVolumetric3D(lat: number, lon: number): CanopyColumnData {
    const { width, height, depth, densityData, elevationData } = this.voxelGrid;

    const u = ((lon + 180) % 360 + 360) % 360 / 360;
    const v = (90 - lat) / 180;

    const vx = Math.min(width - 1, Math.max(0, Math.floor(u * width)));
    const vy = Math.min(height - 1, Math.max(0, Math.floor(v * height)));
    const colIdx = vy * width + vx;

    const strata: StratumData[] = [];
    let maxCanopyHeight = 0;
    let highestOccupiedStratum = 0;

    for (let z = 0; z < depth; z++) {
      const d = densityData[colIdx * depth + z];
      const bound = STRATA_BOUNDS[z];
      strata.push({
        stratumIndex: z,
        minAlt: bound.minAlt,
        maxAlt: bound.maxAlt,
        name: bound.name,
        layerCategory: bound.category,
        density: d,
        biomassTonsPerHa: Math.round(d * 75),
      });

      if (d > 0.15) {
        highestOccupiedStratum = z;
        maxCanopyHeight = bound.maxAlt * (0.8 + d * 0.2);
      }
    }

    if (maxCanopyHeight === 0 && strata[0].density > 0) {
      maxCanopyHeight = strata[0].density * 7.5;
    }

    const understoryDensity = (strata[0].density + strata[1].density) / 2;
    const midCanopyDensity = (strata[2].density + strata[3].density + strata[4].density) / 3;
    const emergentDensity = (strata[5].density + strata[6].density + strata[7].density) / 3;
    const totalDensity = Math.max(0.001, understoryDensity + midCanopyDensity + emergentDensity);

    let fhd = 0;
    const sumLAD = strata.reduce((acc, s) => acc + s.density, 0) || 1;
    for (const s of strata) {
      const p = s.density / sumLAD;
      if (p > 0.0001) fhd -= p * Math.log(p);
    }

    const pai = (maxCanopyHeight / 60) * 8.2 * (totalDensity / 1.6);
    const { biome, isLand } = this.calculateForestHeightAtCoordinate(lat, lon);

    // Active Z Gate density
    const zGateIdx = Math.min(7, Math.max(0, Math.floor(this.activeZGateMeters / 7.5)));
    const activeZDensity = strata[zGateIdx]?.density || 0;

    const params5 = this.calculate5Parameters(lat, lon, isLand, maxCanopyHeight);

    return {
      lat,
      lon,
      maxCanopyHeight: Number(maxCanopyHeight.toFixed(1)),
      airQualityIndex: params5.airQualityIndex,
      aerosolOpticalDepth: params5.aerosolOpticalDepth,
      oceanCurrentSpeed: params5.oceanCurrentSpeed,
      seaSurfaceTempC: params5.seaSurfaceTempC,
      co2Ppm: params5.co2Ppm,
      groundElevation: elevationData[colIdx] || 0,
      totalCoverPercent: isLand ? Math.min(100, Math.round((maxCanopyHeight / 50) * 98)) : 0,
      strata,
      understoryRatio: understoryDensity / totalDensity,
      midCanopyRatio: midCanopyDensity / totalDensity,
      emergentRatio: emergentDensity / totalDensity,
      foliageHeightDiversity: Number(fhd.toFixed(2)),
      plantAreaIndex: Number(pai.toFixed(2)),
      biomeName: isLand ? biome : 'Marine Ocean Shelf',
      sourceType: '3D Voxel Native',
      activeZGate: this.activeZGateMeters,
      activeZDensity,
    };
  }

  public calculate5Parameters(lat: number, lon: number, isLand: boolean, heightMeters: number) {
    // 2. Air Quality Index (AQI: 10 to 250)
    let aqi = 25;
    if (!isLand) {
      aqi = 15 + Math.abs(Math.sin(lat * 0.1)) * 12;
    } else {
      if (lat >= 20 && lat <= 42 && lon >= 70 && lon <= 125) {
        aqi = 110 + this.pseudoNoise(lat * 4, lon * 4) * 35;
      } else if (lat >= 30 && lat <= 48 && lon >= -95 && lon <= -72) {
        aqi = 65 + this.pseudoNoise(lat * 4, lon * 4) * 25;
      } else if (lat >= 42 && lat <= 55 && lon >= -2 && lon <= 30) {
        aqi = 60 + this.pseudoNoise(lat * 4, lon * 4) * 20;
      } else if (heightMeters > 30) {
        aqi = 28 + this.pseudoNoise(lat * 4, lon * 4) * 8;
      } else {
        aqi = 40 + this.pseudoNoise(lat * 4, lon * 4) * 15;
      }
    }

    // 3. GEOS Aerosols (AOD: 0.02 to 1.2)
    let aod = 0.08;
    if (lat >= 12 && lat <= 32 && lon >= -18 && lon <= 55) {
      aod = 0.65 + this.pseudoNoise(lat * 3, lon * 3) * 0.35;
    } else if (lat <= -40 && lat >= -62 && !isLand) {
      aod = 0.32 + Math.abs(this.pseudoNoise(lat * 2, lon * 2)) * 0.15;
    } else if (lat >= -10 && lat <= 5 && lon >= 12 && lon <= 30) {
      aod = 0.45 + this.pseudoNoise(lat * 3, lon * 3) * 0.25;
    } else if (heightMeters > 40) {
      aod = 0.12 + this.pseudoNoise(lat * 3, lon * 3) * 0.06;
    } else {
      aod = 0.06 + Math.abs(this.pseudoNoise(lat * 2, lon * 2)) * 0.08;
    }

    // 4. Sea Surface Currents & Temp
    let currentSpeed = 0.0;
    let sst = 20.0;
    if (!isLand) {
      sst = Math.max(1.5, 30.0 - Math.pow(Math.abs(lat) / 90, 1.4) * 28.5);
      if (lat >= 25 && lat <= 44 && lon >= -80 && lon <= -45) {
        currentSpeed = 1.6 + this.pseudoNoise(lat * 4, lon * 4) * 0.5;
      } else if (lat >= 24 && lat <= 42 && lon >= 125 && lon <= 155) {
        currentSpeed = 1.5 + this.pseudoNoise(lat * 4, lon * 4) * 0.5;
      } else if (lat >= -60 && lat <= -45) {
        currentSpeed = 0.9 + this.pseudoNoise(lat * 4, lon * 4) * 0.3;
      } else if (Math.abs(lat) <= 8) {
        currentSpeed = 0.8 + this.pseudoNoise(lat * 4, lon * 4) * 0.3;
      } else {
        currentSpeed = 0.25 + Math.abs(this.pseudoNoise(lat * 2, lon * 2)) * 0.2;
      }
    }

    // 5. DYAMOND CO2 (405 to 430 ppm)
    let co2 = 419.0;
    if (heightMeters > 35) {
      co2 = 410.5 - (heightMeters / 60) * 3.5;
    } else if (lat >= 45 && lat <= 65 && isLand) {
      co2 = 412.0 + this.pseudoNoise(lat * 3, lon * 3) * 3.0;
    } else if (aqi > 90) {
      co2 = 425.0 + this.pseudoNoise(lat * 3, lon * 3) * 4.0;
    } else {
      co2 = 418.5 + this.pseudoNoise(lat * 2, lon * 2) * 2.5;
    }

    return {
      airQualityIndex: Number(Math.max(10, Math.min(250, aqi)).toFixed(0)),
      aerosolOpticalDepth: Number(Math.max(0.02, Math.min(1.2, aod)).toFixed(3)),
      oceanCurrentSpeed: Number(Math.max(0, Math.min(2.5, currentSpeed)).toFixed(2)),
      seaSurfaceTempC: Number(Math.max(1.5, Math.min(32, sst)).toFixed(1)),
      co2Ppm: Number(Math.max(405, Math.min(435, co2)).toFixed(1)),
    };
  }

  // =========================================================================
  // BIOME-AWARE ALLOMETRIC VERTICAL PROFILE SYNTHESIZER
  // =========================================================================
  public synthesizeVerticalStrata(
    canopyHeight: number,
    biome: string,
    lat: number
  ): StratumData[] {
    const strata: StratumData[] = [];

    // Allometric profile curves:
    // Biome-specific leaf area density distribution
    let weights = [0.6, 0.4, 0.2, 0.1, 0.0, 0.0, 0.0, 0.0]; // default low shrub

    if (canopyHeight > 45) {
      // Emergent Tropical Rainforest (Amazon, Congo, Borneo):
      // Multi-peak: Dense ground understory (herb/shrub layer), moderate mid-trunk, high dense crown (40-55m)
      weights = [0.65, 0.45, 0.55, 0.75, 0.85, 0.95, 0.80, 0.55];
    } else if (canopyHeight > 35) {
      // Tall Temperate / Valdivian / Deciduous:
      // Gaussian rounded crown peak around 25-40m
      weights = [0.50, 0.40, 0.65, 0.85, 0.75, 0.45, 0.15, 0.0];
    } else if (canopyHeight > 20) {
      // Boreal Taiga (Conical Spire):
      // Dense base to mid spire tapering to thin peak at top
      weights = [0.70, 0.75, 0.80, 0.50, 0.20, 0.05, 0.0, 0.0];
    } else if (canopyHeight > 10) {
      // Woodland / Savanna:
      // Low canopy concentrated between 5m and 15m
      weights = [0.80, 0.65, 0.30, 0.10, 0.0, 0.0, 0.0, 0.0];
    } else if (canopyHeight > 2) {
      // Shrubland:
      weights = [0.85, 0.30, 0.05, 0.0, 0.0, 0.0, 0.0, 0.0];
    } else {
      weights = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0];
    }

    // Scale weights by actual height ceiling
    for (let i = 0; i < 8; i++) {
      const bound = STRATA_BOUNDS[i];
      let density = weights[i];

      // If stratum is above max canopy height, taper to 0
      if (bound.minAlt > canopyHeight) {
        density = 0;
      } else if (bound.maxAlt > canopyHeight) {
        const frac = (canopyHeight - bound.minAlt) / (bound.maxAlt - bound.minAlt);
        density *= Math.max(0, frac);
      }

      strata.push({
        stratumIndex: i,
        minAlt: bound.minAlt,
        maxAlt: bound.maxAlt,
        name: bound.name,
        layerCategory: bound.category,
        density: Number(density.toFixed(3)),
        biomassTonsPerHa: Math.round(density * 80),
      });
    }

    return strata;
  }

  // =========================================================================
  // FILE UPLOAD HANDLERS (2D RASTER IMAGES & 3D JSON VOXEL GRIDS)
  // =========================================================================
  public async loadFromFile(file: File): Promise<{ success: boolean; message: string }> {
    const ext = file.name.split('.').pop()?.toLowerCase();

    if (ext === 'json') {
      try {
        const text = await file.text();
        const json = JSON.parse(text);

        if (json.voxels && Array.isArray(json.voxels)) {
          // 3D Voxel format
          this.mode = '3D_VOLUMETRIC';
          this.loadCustom3DJson(json);
          this.notifyDataUpdated();
          return { success: true, message: `Loaded 3D Volumetric Grid: ${file.name}` };
        } else if (json.grid && Array.isArray(json.grid)) {
          // 2D Grid format
          this.mode = '2D_SURFACE';
          this.loadCustom2DGridJson(json);
          this.notifyDataUpdated();
          return { success: true, message: `Loaded 2D Raster Grid: ${file.name}` };
        } else {
          return { success: false, message: 'Unrecognized JSON schema. Expected { voxels } or { grid }' };
        }
      } catch (err) {
        return { success: false, message: `JSON parsing error: ${(err as Error).message}` };
      }
    } else if (['png', 'jpg', 'jpeg', 'webp'].includes(ext || '')) {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            this.mode = '2D_SURFACE';
            this.canvas2D.width = img.width;
            this.canvas2D.height = img.height;
            this.width2D = img.width;
            this.height2D = img.height;
            this.ctx2D.drawImage(img, 0, 0);
            this.imageData2D = this.ctx2D.getImageData(0, 0, img.width, img.height);
            this.notifyDataUpdated();
            resolve({
              success: true,
              message: `Loaded 2D Raster Image: ${file.name} (${img.width}x${img.height})`,
            });
          };
          img.onerror = () => {
            resolve({ success: false, message: 'Failed to decode image file' });
          };
          img.src = e.target?.result as string;
        };
        reader.readAsDataURL(file);
      });
    }

    return { success: false, message: `Unsupported file format: .${ext}. Use .png, .jpg, or .json` };
  }

  private loadCustom3DJson(json: { width?: number; height?: number; depth?: number; voxels: number[] }) {
    const w = json.width || 180;
    const h = json.height || 90;
    const d = json.depth || 8;
    this.voxelGrid = {
      width: w,
      height: h,
      depth: d,
      densityData: new Float32Array(json.voxels),
      elevationData: new Float32Array(w * h).fill(100),
    };
  }

  private loadCustom2DGridJson(json: { width: number; height: number; grid: number[][] }) {
    this.width2D = json.width;
    this.height2D = json.height;
    this.canvas2D.width = json.width;
    this.canvas2D.height = json.height;

    const imgData = this.ctx2D.createImageData(json.width, json.height);
    for (let y = 0; y < json.height; y++) {
      for (let x = 0; x < json.width; x++) {
        const heightMeters = json.grid[y][x];
        const rgb = this.heightToThermalRGB(heightMeters);
        const idx = (y * json.width + x) * 4;
        imgData.data[idx] = rgb.r;
        imgData.data[idx + 1] = rgb.g;
        imgData.data[idx + 2] = rgb.b;
        imgData.data[idx + 3] = 255;
      }
    }
    this.ctx2D.putImageData(imgData, 0, 0);
    this.imageData2D = imgData;
  }
}

// Singleton global instance
export const globalForestLoader = new UniversalForestLoader();

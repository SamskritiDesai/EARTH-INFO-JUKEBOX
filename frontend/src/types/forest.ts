// Types for TERRA-SCAN // Earth Information Jukebox
// 4-Parameter Streamlined Ambient Jukebox Architecture

export type DatasetMode = '2D_SURFACE' | '3D_VOLUMETRIC';

export type PlaybackMode = 'MANUAL_POINTER' | 'AUTO_PLAY_ROUTE';

export interface StratumData {
  stratumIndex: number; // 0 to 7
  minAlt: number; // e.g. 0
  maxAlt: number; // e.g. 7.5
  name: string; // e.g. "Understory (0-7.5m)"
  layerCategory: 'UNDERSTORY' | 'MID_CANOPY' | 'EMERGENT_CROWN';
  density: number; // 0.0 to 1.0 (LAD: Leaf Area Density)
  biomassTonsPerHa: number; // estimated biomass
}

export interface CanopyColumnData {
  lat: number;
  lon: number;

  // The 4 Streamlined Earth Parameters
  oceanCurrentSpeed: number; // 1. Global Sea Surface Currents (0.0 to 2.5 m/s)
  seaSurfaceTempC: number; // Sea Surface Temperature (1.5 to 32.0 °C)
  aerosolOpticalDepth: number; // 2. GEOS Aerosols (AOD, 0.02 to 1.2, smoke/dust/salt)
  co2Ppm: number; // 3. DYAMOND Global CO2 (405 to 435 ppm)
  maxCanopyHeight: number; // 4. GEDI Forest Height (RH98, 0 to 60+m)

  // Structural details
  groundElevation: number; // meters above sea level
  totalCoverPercent: number; // 0 to 100%
  strata: StratumData[]; // 8 vertical strata (0 to 60m)
  understoryRatio: number; // 0 to 1
  midCanopyRatio: number; // 0 to 1
  emergentRatio: number; // 0 to 1
  foliageHeightDiversity: number; // S_3D (Shannon index FHD, 0 to 2.2)
  plantAreaIndex: number; // PAI (m²/m², 0 to 8.5)
  biomeName: string;
  sourceType: '2D Raster Interpolated' | '3D Voxel Native';
  activeZGate: number; // 0 to 60m
  activeZDensity: number; // density at current Z elevation gate
}

export interface RegionBiome {
  id: string;
  name: string;
  shortLabel: string;
  lat: number;
  lon: number;
  zoomDist: number;
  canopyAvg: number;
  dominantTrees: string;
  description: string;
}

export interface ScanAxisConfig {
  id: string;
  name: string;
  type: 'LATITUDE' | 'LONGITUDE';
  value: number; // lat in deg or lon in deg
  description: string;
}

export interface ChannelMixerState {
  volume: number; // 0.0 to 1.0
  muted: boolean;
  solo: boolean;
  frequency: number; // live frequency in Hz
  activityLevel: number; // 0 to 1 (for meter feedback)
  chordName?: string;
  themeLabel: string;
  isAvailable: boolean; // Timeline availability mask
}

export interface DJMixerState {
  chOcean: ChannelMixerState; // 1. Global Sea Surface Currents & Temp ("Velvet Sub-Pad & Wave Wash")
  chAerosols: ChannelMixerState; // 2. GEOS Aerosols ("Flowy Chords — Airy Lydian Pads")
  chCo2: ChannelMixerState; // 3. DYAMOND Global CO2 ("Deep, Soft Felt Bass")
  chForest: ChannelMixerState; // 4. GEDI Forest Height ("Warm Organic Rhodes & Soft Kalimba/Pad")
  crossfader: number; // 0.0 (Ocean/Aerosol Flow) to 1.0 (Forest/Carbon Warmth)
  masterVolume: number; // 0.0 to 1.0
  bpm: number; // Relaxed 72 BPM ambient tempo
  currentStep: number; // 0 to 15
  currentChord: string; // e.g. "Fmaj9 // Dm7"
  chordTones: string[]; // e.g. ["F", "A", "C", "E", "G"]
  harmonicKey: string; // "F Major 9 / D Minor 7 Ambient Pentatonic"
  isPlaying: boolean;
  isAudioInitialized: boolean;
  playbackMode: PlaybackMode;
  activeTimeline: string;
}

export interface HoverTooltipInfo {
  visible: boolean;
  x: number;
  y: number;
  title: string;
  parameterName: string;
  gediMetric: string;
  currentValue: string | number;
  units: string;
  percentageValue: number; // 0 to 100 for visual bar
  barColor: string; // CSS color
  soundDescription: string; // Plain-English sound description
  scientificDescription: string; // Plain-English scientific explanation
  isAvailable?: boolean;
}
